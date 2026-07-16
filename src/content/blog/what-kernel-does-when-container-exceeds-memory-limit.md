---
title: "What does the kernel do when a container exceeds a memory limit?"
description: "A hands-on report on how the Linux OOM Killer works inside a cgroup v2 container, verified with dmesg logs and memory.events counters."
pubDate: 2026-07-15
tags: [Container, cgroup_v2, Rust]
---

# What does the kernel do when a container exceeds a memory limit?

> This post is a report of what happens in the kernel when a process inside a container exceeds the `memory.max` setting, and why only the process that uses too much memory dies.
> I wanted to figure out how the OOM Killer works in Linux, how lazy allocation works in Rust, how memcg charging works, how the kernel reclaims memory, and how the victim process is chosen by the OOM Killer.

---

## Why I did this

Using a container as a tool is very different from understanding how the isolation actually works in Linux. We can say "the OOM Killer runs when a container exceeds its memory limit," but we cannot clearly explain things like "what exactly does the kernel do in that moment" or "why is one process killed while the others stay alive."

So I decided to check this myself. Instead of just memorizing it, I wanted to trigger a real OOM situation in a controlled environment and watch each step through the kernel logs and the cgroup counters.

## Experiment environment

- t4g.small (ARM64), Ubuntu 24.04, 2GB RAM
- cgroup v2 unified
- Docker busybox container: `--memory 128m --memory-swap 128m --cpus 0.3`

One design choice matters here. I set `--memory-swap` to the same value as memory, which makes the available swap space `0`. I will explain the full reason later, but in short, this lets me trigger the OOM situation in a deterministic way by blocking the swap path. If swap is alive, the kernel tries to push memory into the swap space, which can prevent the OOM situation from happening. That would make the experiment non-deterministic.

You can observe the system with two terminals.

```bash
# Terminal 1: real-time kernel log (sudo is required because dmesg_restrict=1)
sudo dmesg -w

# Terminal 2: poll the cgroup memory state
# Move into the container's scope directory under /sys/fs/cgroup/...
# You can find the path by reading /proc/<PID>/cgroup
watch -n0.2 'cat memory.current; cat memory.events'
```

Before we start, it helps to understand the `memory.events` counters.

- `max`: the number of times a direct reclaim was forced because the cgroup reached `memory.max`.
- `oom`: the number of times the cgroup entered an OOM state because reclaim could not free enough pages. This is separate from whether a process was actually killed.
- `oom_kill`: the number of times the OOM Killer actually killed a process.
- `oom_group_kill`: the number of times the whole cgroup was killed at once, which can also take down the container itself.

The key point is that `oom` and `oom_kill` are not the same thing. Even when the cgroup enters an OOM state, not every case ends in a kill. A process can survive if reclaim manages to free enough space under the limit.

---

## When is OOM triggered?

Here is one sentence that holds the whole post together.

> **The program never asks for memory. It only says "I will write to this address," and the kernel quietly tries to attach physical memory at that moment, and fails.**

We can split this into three ideas.

1. **It attaches when you write.** Physical memory is attached at the moment of writing (a page fault), not when the memory is requested.
2. **The budget fills up, not the RAM.** A cgroup OOM is not a physical RAM shortage. It means the process could not get free space within `memory.max`, which is a failed memcg charge.
3. **The kernel reclaims before it kills.** The OOM Killer is the last step. The kernel first tries to free space by reclaiming, and only kills a process when reclaim fails.

We will check each of these three ideas one by one.

---

## First check: memory attaches "when you write" (lazy allocation)

Let's start with the first idea. To see whether physical pages really attach only at the moment of writing, I made two versions to compare. Both handle 128MB in Rust.

### Version 1: reserve only, never write

```rust
fn main() {
    let mut buffer: Vec<u8> = Vec::new();
    let size = 128 * 1024 * 1024;
    buffer.reserve(size);   // reserve virtual address space only

    println!("reserved {} MB", size as f64 / (1024.0 * 1024.0));
    std::thread::sleep(std::time::Duration::from_secs(100));
}
```

`reserve` only secures the virtual address space. If you never write to it, the kernel delays the physical page allocation, which is called lazy allocation. Even inside a 128MB container, this program does not die, because `memory.current` never rises close to the limit. The virtual space is reserved, but the RSS does not grow.

> To run it inside the container, you need to build a statically linked binary. busybox has no glibc, so a dynamically linked binary will not run.
> ```bash
> rustup target add aarch64-unknown-linux-musl
> cargo build --release --target aarch64-unknown-linux-musl
> docker cp target/aarch64-unknown-linux-musl/release/hog <container>:/hog
> ```

### Version 2: write into the reserved space

```rust
fn main() {
    let mut buffer: Vec<u8> = Vec::new();
    let size = 128 * 1024 * 1024;
    buffer.reserve(size);
    buffer.extend(std::iter::repeat(1u8).take(size));  // touch all 128MB

    println!("holding {} MB", buffer.len() as f64 / (1024.0 * 1024.0));
    std::thread::sleep(std::time::Duration::from_secs(100));
}
```

When you fill 128MB with `extend`, you touch every page, and the physical pages attach at that moment. When you run this, it dies right away with an OOM.

```
Memory cgroup out of memory: Killed process 158600 (hog)
  total-vm:131676kB, anon-rss:129876kB, file-rss:396kB, oom_score_adj:0
```

`anon-rss:129876kB` means about 127MB of anonymous pages actually attached. In Version 1, this value stayed near zero. The difference between the two versions is the proof that physical pages attach only when you touch them.

This is also a common trap in real work. If you only reserve memory with `malloc` or `vec![0u8; N]` and never touch it, the memory accounting does not rise, so you can waste time asking "why doesn't it die even though I passed the limit?" The first idea, that memory attaches when you write, is confirmed.

---

## Second check: the call stack inside the kernel

When Version 2 died, dmesg printed a call stack. This is where the "one sentence" above shows up as an actual kernel code path.

```
do_page_fault              # "there is no physical page for this address"
  do_anonymous_page        # "let's attach a new anon (heap/stack) page"
    alloc_anon_folio       # get a physical page
      __mem_cgroup_charge  # "record this page on this cgroup's budget"
        try_charge_memcg   # try to charge, then detect the limit is full
          try_to_free_mem_cgroup_pages()  # reclaim first, before killing
            shrink_node()                 # scan the LRU and try to reclaim
          [reclaim failed]
          mem_cgroup_out_of_memory()      # declare OOM
            oom_kill_process()            # pick a victim, then SIGKILL
```

If we map each step to the three ideas, it reads like this.

- **`do_page_fault` to `do_anonymous_page`**: a page fault happens the moment the program writes, and the kernel enters the path that attaches an anon page. This is exactly why Version 1 never even entered this path, because it never wrote anything, so there was no page fault.
- **the limit is full at `try_charge_memcg`**: the problem is not that physical RAM ran out. The cgroup budget (128MB) filled up. That is why the log later shows the constraint as `CONSTRAINT_MEMCG`.
- **`try_to_free_mem_cgroup_pages` fails, then `oom_kill_process`**: even after hitting the limit, the kernel does not kill right away. It first tries to reclaim with `shrink_node`, and only kills when that fails.

An important detail is that `try_charge_memcg` is the function that tries to charge, and reclaim is called inside it. So the order is: charge fails, then reclaim runs inside, then reclaim also fails, then OOM. Charging and reclaiming are two separate steps.

The reclaim failed here, but not because the kernel was "busy." The kernel can only reclaim memory whose original copy lives somewhere else.

- **file page** (file cache): the original is on disk, so it can be dropped, which means it is reclaimable.
- **anon page** (heap/stack): the RAM itself is the original, so to drop it the kernel has to move it to swap. If there is no swap, it cannot be reclaimed.

This experiment used anonymous memory with swap set to 0. So there was no reclaimable target from the start. This is the reason I fixed swap to 0 by design, which is to block the reclaim path and make the OOM deterministic. The memcg stats in dmesg back this up.

```
pgscan_direct 2     # pages the kernel scanned while trying to reclaim
pgsteal_direct 2    # pages it actually reclaimed (basically zero)
pswpout 0           # pages pushed out to swap: 0 (because there is no swap)
```

All three ideas are now confirmed in the call stack. Memory attaches when you write (`do_anonymous_page`), the budget fills up (`try_charge_memcg`), and the kernel reclaims before it kills (`shrink_node`).

---

## Third check: what dies is the process, not the container

While running Version 2 several times, one thing stood out. What died was always an individual process (`Killed process ...`), not the container. The container kept running.

The reason is in the kernel's point of view. The kernel has no concept of "shutting down a container." To the kernel, a container is just a bundle of a cgroup and namespaces, and the OOM Killer only picks one task inside it. The container's PID 1, which was `sh -c "while true..."` here, uses almost no memory, so it never became a victim candidate. That is why the container stayed alive.

So which process gets chosen as the victim? That is the next question.

---

## How is the victim chosen? The trap in the tool, and a tool I built myself

At first I triggered the OOM with a load tool called `stress-ng`. It died well. But while reading the logs, I found a problem.

```
Killed process 59795 (stress-ng-vm) ... oom_score_adj:1000
```

`oom_score_adj:1000`. `stress-ng` sets this value on its worker on purpose. It marks itself as the preferred victim, as if to say "do not kill the system, kill me first when an OOM happens." In other words, the kernel's natural victim selection logic (`oom_badness`) did not really run. `stress-ng` short-circuited the selection, so it killed itself.

That meant I could not observe "how the kernel chooses a victim" with `stress-ng`. I needed a tool that does not turn itself in. So I built one, by taking Version 2 above and only changing the size, into three programs.

- `candidate100mb`: touches 100MB
- `candidate30mb`: touches 30MB
- `candidate10mb`: touches 10MB
- all three use `oom_score_adj=0` (the default, no self-marking)

I put all three into the same 128MB container at once, where the total demand (140MB) is larger than the limit, so an OOM was guaranteed.

### Observation: biggest first, then a second OOM

The logs show two separate OOM events about 3ms apart, not one event that killed two processes. The timestamps make this clear.

```
55811.178199  Killed process 161410 (candidate100mb)   # OOM #1
55811.181573  candidate30mb invoked oom-killer          # OOM #2, ~3.4ms later
55811.181783  Killed process 161584 (candidate30mb)
```

**First OOM**, where all three are still in the candidate table:

```
[  pid  ]  ... rss_anon ... oom_score_adj  name
[ 161410]      25608          0            candidate100mb   # largest
[ 161563]       2568          0            candidate10mb    # smallest
[ 161584]       4191          0            candidate30mb
-> Killed process 161410 (candidate100mb)
```

**Second OOM** (about 3ms later). In this candidate table, 100mb is already gone, and the largest one left is 30mb:

```
-> Killed process 161584 (candidate30mb)
```

And when I check with `ps` inside the container:

```
PID   USER     COMMAND
 1321 root     ./candidate10mb    # survived
```

Three things are confirmed. Since every candidate had `oom_score_adj=0`, there is no self-marking variable in the way.

1. **Order**: the process that uses the most memory (100mb) dies first.
2. **Selection**: the smallest process (10mb) survives.
3. **One kill per OOM event**: each OOM event kills exactly one process. The second kill happened because a second charge failure triggered a second, separate OOM.

At first I read this as "killing 100mb was not enough, so the kernel kept killing down to the limit." But the numbers disprove that. At OOM #1, the rss_anon values were about 100MiB (100mb), 16MiB (30mb, still allocating), and 10MiB (10mb), so about 126MiB total against the 128MiB limit. If the kernel had killed 100mb and freed 100MiB, only about 26MiB would remain, which is far under the limit. So "not enough" cannot be the reason.

What actually happened is an OOM overkill caused by asynchronous reclaim. A `SIGKILL` does not return memory right away. The real page reclaim is done later by the `oom_reaper`, which runs asynchronously. In the ~3.4ms gap after 100mb was killed, its memory was not returned yet, so `memory.current` was still near the limit. Meanwhile 30mb was still allocating, so it faulted again, the charge failed again, and this triggered OOM #2. In OOM #2, 100mb was already marked as a victim and excluded from reselection, so the largest remaining process, 30mb, was killed.

And 10mb survived not because "the kernel stopped once it dropped below the limit," but because the process that was driving the allocation (30mb) was now dead, so no new page fault happened. 10mb had already finished writing and was sleeping, so it did not fault, and no third OOM was triggered.

I want to be honest about the evidence here. The two-separate-OOM timing and the victim exclusion are both visible in the logs above. The asynchronous reclaim delay is the mechanism that best explains them, but I did not capture `memory.current` during that 3.4ms window, so I did not directly observe the delay itself. To confirm it on a re-run, you would watch whether `memory.current` stays near the limit through both kills and only drops after 30mb dies. The kernel-side anchors to read are `oom_reaper`, `MMF_OOM_SKIP`, and the victim exclusion in `oom_evaluate_task`. The term for this overkill pattern is "OOM overkill."

This selection is handled by the kernel function `oom_badness()`. It scores each process based on its memory usage (mainly rss_anon), adds the `oom_score_adj` adjustment, and picks the highest score as the victim. This time every process had adj=0, so it was purely by memory size. Note that `oom_badness` is not a system call. It is an internal kernel function. User space does not call it. The kernel calls it internally to score processes during an OOM.

---

## Reclaim is tried until the last moment

If you compare `pgsteal_direct` (the number of pages actually reclaimed) as you add more processes, an interesting trend shows up.

```
single process:  pgsteal_direct 2
2 competing:     pgsteal_direct 3864
3 competing:     pgsteal_direct 4908
```

The more processes compete, the more the kernel tries to reclaim before it kills. The `failcnt` (the number of failed charges) also went up along with it (229, then 298, then 315). This is the quantitative trace of the principle that OOM is the last resort. The kernel keeps trying to solve the situation with reclaim until the very end, and only kills a process after that reclaim is confirmed to have failed. `pswpout 0` stayed at zero the whole time, because with swap at 0 the kernel could not reclaim anon pages, so what it did reclaim came entirely from the file and slab side.

---

## Side note: how to kill the whole container at once

So far, only one process died at a time. To kill the whole container in one shot, you have to turn on `memory.oom.group`.

```bash
echo 1 | sudo tee <scope>/memory.oom.group
```

If you turn on this switch and apply the same load, the kernel declares it explicitly at the OOM moment.

```
Tasks in /system.slice/docker-....scope are going to be killed
  due to memory.oom.group set
```

Then it kills every process in the cgroup at once, including PID 1. Since PID 1 dies, the container itself shuts down, and dmesg even prints the network interface going down (`docker0: port ... entered disabled state`).

It is important to separate two ideas here.

- **`oom_badness`** (the selection logic): when `oom.group=0`, it decides who the "one" victim will be.
- **`memory.oom.group`** (the scope switch): it decides whether to kill just one process or the entire cgroup.

Running many processes does not trigger a group kill. The `oom.group` switch is what decides that.

---

## Trust the counter, not the log

Finally, one trap in measurement that I ran into during the experiment. I tried to count OOM kills by counting dmesg log lines, and I got a strange number.

```bash
grep -c "invoked oom-killer" output.txt   # 27
grep -c "Killed process"     output.txt   # 57
```

The killer was invoked 27 times, but 57 processes died. At first I made a plausible guess, like "did several processes die from a single invocation?" But when I parsed the logs, every guess was disproved. The real cause was in this one line.

```
oom_kill_process: 16 callbacks suppressed
```

This is the kernel's printk log suppression. When the same message floods in, the kernel suppresses the log output and only tells you later "I skipped this many." Killing the processes never stopped. Only the logging of those kills was suppressed. So the `invoked oom-killer` banner was lost, but every kill actually happened.

This leads to the most practical lesson of the experiment.

> **You should count OOM kills with the `oom_kill` counter in `memory.events`, not with the dmesg log.**

The log gets undercounted because of rate limiting, but the kernel counter is not suppressed. If you build OOM monitoring in production with `grep`, you can miss half of the real kills. When a measured value looks strange, the first thing to suspect is not the phenomenon but the measurement tool itself. If you skip validating the measurement and jump straight to explaining the phenomenon, you can end up inventing a mechanism that does not exist.

---

## Summary

I started from one sentence and checked, step by step, what the kernel does when a program inside a container exceeds `memory.max`.

- **It attaches when you write.** Physical pages attach at the moment of writing (a page fault), not when memory is requested. The program that only used `reserve` did not die, while the one that touched memory with `extend` did.
- **The budget fills up.** A cgroup OOM is not a physical RAM shortage but a memcg charge overflow. The proof is that the constraint was printed as `CONSTRAINT_MEMCG`.
- **The kernel reclaims before it kills.** Even after hitting the limit, it tries reclaim first and only kills when that fails. With the anon plus swap-0 combination, there was no reclaimable target, so it always ended in an OOM.
- **The biggest process dies first, one per OOM event.** With three processes that do not mark themselves, I confirmed that the kernel picks the biggest process as the victim. When two processes died, it was two separate OOM events, not one. The likely cause is that a `SIGKILL` does not free memory instantly, since the `oom_reaper` reclaims it asynchronously, so the still-allocating process faulted again and triggered a second OOM. The smallest process survived because the process driving the allocation was gone, not because the kernel counted down to the limit.
- **Counter, not log.** Because of printk suppression, log-based counting misses real kills. The `memory.events` counter is the source to trust.

The part I valued most in this experiment was noticing the `oom_score_adj=1000` self-marking problem in `stress-ng`, and then building my own tool to get past that limit. The moment I realized that a tool which turns itself in cannot reveal the victim selection logic, the direction of the whole experiment became clear.

---

*Environment: t4g.small (ARM64), Ubuntu 24.04, Linux 7.0.0-1006-aws, cgroup v2. The Rust source for the hog programs and the full dmesg logs are available at [repository link].*