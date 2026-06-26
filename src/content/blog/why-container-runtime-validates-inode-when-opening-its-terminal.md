---
title: "Why the container runtime validates file's inode when opening a terminal?"
description: System programming study about file descriptor, inode, PTY and CVE-2025-52565 with Youki
pubDate: 2026-06-22
tags: [Rust, System Programming, Container Runtime, Virtualization]
---

### Overview

While contributing into an open source [Youki](), i got stuck by two things. I've learned about file descriptor and inode in operating system class in the university, but I totally forgot what was it. So this post is the study node that learning what the `file descriptor`, `inode`, `fstat/fstatfs`, `terminal with /dev/ptms`, `devpts` is.

### What is file descriptor?

When opening a file using `open()` system call, it returns a number.
The number returned from the system call is not just a number, it called `file descriptor`.
`file descriptor` is an index of the table of each processes.

If a process opens a file, it returns a number like `3`. This number is just an index of each process's `file descriptor table`.

`fd 0`: stdin
`fd 1`: stdout
`fd 2`: sterr
`3, 4, 5, ...`: opened files... (sequentially increased)

> For example if we order some hamburger set from McDonalds, we receive an order number 1111. 1111 is not a location where the hamburger is. If we hand over the number ticket to a cashier, the cashier finds my tray and pass it to me. So, the `file descriptor` works like this.

The real pointers which refers a real data is hidden in the kernel, and process cannot see them itself. Process only has a `number`. The reason why the system was designed like this is for isolation and security. If the process can handle the actual file pointer, hackers could modify the file pointer and access to the unauthorized files.

#### Rust's `RawFd` and `OwnedFd`

In `C`, developer should manage the file descriptor when and who will `close()` it.
But in `Rust`, it classify by `type`.

RawFd : int32 : Not owned, Just borrowed integer, No need to close
OwnedFd : wrapper that contains file descriptor : If descriptor dropped, automatically call `close()`

### What is INODE?

INODE = `index node`
It is a metadata struct which held by the filesystem for each objects(file, directory, devices, etc.).

INODE has `object type`, `authority`, `owner uid/gid`, `size`, `timestamp`, `# of hard-links`, `location of data block`, and `unique inode number within the filesystem`.

We can check the file's inode by using `stat` command in linux.
```bash
ubuntu@ip-172-31-40-203:~/youki$ stat README.md
  File: README.md
  size: 11173           Blocks: 24         IO Block: 4096   regular file
Device: 259,1   Inode: 1510971     Links: 1
Access: (0664/-rw-rw-r--)  Uid: ( 1000/  ubuntu)   Gid: ( 1000/  ubuntu)
Access: 2026-06-21 08:21:06.216775294 +0000
Modify: 2026-06-18 13:56:55.464085633 +0000
Change: 2026-06-18 13:56:55.464085633 +0000
 Birth: 2026-06-18 13:56:55.464085633 +0000
```

In `Rust`, we can check the file's metadata by calling `fstat` systemcall. It returns `stat` struct which contains the above metadata.

### statfs/fstatfs system call

There are three sibling calls.
- `stat(path)`: look up metadata by path name
- `lstat(path)`: same as stat but doesn't follow symlinks
- `fstat(file_descriptor)`: look up metadata of the file descriptor that you already hold

In Youki, to verify the inode, it uses `fstat` and `fstatfs` systemcall.

Why `fstat` (by fd) instead of `stat` (by path)?
We already opened `/dev/ptmx` and hold the resulting fd (We will cover this also on below section).  
If we re-checked by path, an attacker could swap what the path points to between our check and our use (a TOCTOU race). But `fstat(fd)` inspects the exact object we already opened, so there's no gap to exploit.

Also, Why `fstatfs` on top of `fstat`?
`fstat` only describes the file itself (inode info). But this couldn't guarantee that the file is mounted on a `devpts` mount. `fstat` doesn't have this mount information, but `fstatfs` could receive a filesystem magic number (e.g. devpts's magic number`0x1cd1`).

Therefore, those two calls are complementary. `fstat` checks the inode information, and `fstatfs` checks whether the file sits on the right kind of filesystem (a real `devpts` mount).

For reference,
[Youki's terminal file inode verification step](https://github.com/youki-dev/youki/blob/522374c129872381e23f6cc9b23653bc4668ece9/crates/libcontainer/src/tty.rs#L180)

### Pseudoterminal Multiplexer Master

To run an interactive shell inside a container, you need a terminal. Long ago a terminal was real hardware, a keyboard and screen wired in over a serial line, and a program talked to it through a device file. Today that's emulated in software, called a pseudoterminal (PTY).

A `PTY` is always created as a `master/slave` pair:
- `slave (/dev/pts/N)`: the character **`device`** the container's shell opens as its terminal, its stdin/stdout/stderr. (The slave is a `device`, not the shell itself. The shell is a separate process that uses the `slave` to receive an input from host or stream an output to host.)
- `master`: The end the host runtime holds.

The two ends are wired together by the kernel, and bytes flow in both directions:

- Input case
input something in your computer 
-> runtime writes it to the master
-> [kernel PTY]
-> becomes readable on the slave
-> the container's shell reads it as stdin

- Output case
the shell writes to the slave (stdout)
-> [kernel PTY]
-> becomes readable on the master
-> runtime reads it from the master
-> your screen can see the output

So what is `/dev/ptmx`?
It stands for `Pseudoterminal Master Multiplexer`, and its only job is to produce a fresh master/slave pair on demand. 

When the runtime opens `/dev/ptmx`:
1. The runtime calls open() on `/dev/ptmx` (a character device node, not a regular file).
2. The kernel allocates a new PTY pair (`master/slave`).
3. It returns the `master` file descriptor to the runtime.
4. It creates the matching `slave` **device** node at `/dev/pts/N`.

So opening `/dev/ptmx` is creating a new console for the container. And because `the ptmx handle` (and the slaves it creates) lives on the `devpts` filesystem, we can validate it with fstatfs which is exactly what Youki does next.

### Device file and major/minor number

If you really open this file in your linux system, you can see like this.
```bash
ubuntu@ip-172-31-40-203:~$ ls -l /dev/ptmx
crw-rw-rw- 1 root tty 5, 2 Jun 26 15:05 /dev/ptmx
```
`c`: character device. it streams a byte
`5, 2`: major, minor number pair -> /dev/ptmx always holds this number

Character device?
In Unix, everything is a file, including device file like disk, usb.
But a device file is a special file which stores no data of its own.
It is just a entrypoint to the specific `device driver`

In device file, it has two kinds of type.
`c`: character device -> A byte stream like, read or write one byte at a time (e.g. terminals, /dev/null, /dev/ptmx, /dev/pts/N)
`b`: block device -> fixed-size blocks with random access (e.g. /dev/nvme..., /dev/sda1, ...)

The major number represents the `device driver number` which could handle the device.
And the minor number selects which specific instance that driver manages.

So, in Youki, after verifying it with `fstat` and `fstatfs`, it checks if the opened device type is `c`, and then if the major and minor number is `5, 2`

```bash
$ ls -l /dev/null /dev/zero /dev/ptmx /dev/pts/0 /dev/nvme0n1p13 /dev/nvme0n1p15
crw-rw-rw- 1 root   root   1,  3 ... /dev/null        # char, major 1   (mem)
crw-rw-rw- 1 root   root   1,  5 ... /dev/zero        # char, major 1   (same driver!)
crw-rw-rw- 1 root   tty    5,  2 ... /dev/ptmx        # char, major 5
crw------- 1 ubuntu tty  136,  0 ... /dev/pts/0       # char, major 136 (pty slave)
brw-rw---- 1 root   disk 259,  2 ... /dev/nvme0n1p13  # block, major 259 (nvme)
brw-rw---- 1 root   disk 259,  4 ... /dev/nvme0n1p15  # block, major 259 (same driver!)
```

### CVE-2025-52565
> For the full details, read Red Hat's document :[Reference](https://access.redhat.com/security/cve/cve-2025-52565)

This flaw is the reason a runtime has to validate the handle when it opens `/dev/ptmx` (and the pty slave). 

When the runtime sets up a container's console, it opens a `ptmx / pts handle`. 
But that handle lives in a part of the filesystem the container can influence, while the runtime itself runs with host privileges. 

If a malicious container can make that "console" resolve to something that isn't a genuine pty, a regular file, a different device, a path it controls, then a host-privileged process ends up operating on an attacker-chosen object. That's the path to host file access or a container escape.

To mitigate this flaw, right after opening the `/dev/ptmx`, it proves the handle is real by inspecting the `fd`(using fstat and fstatfs) and checking:

1. real devpts mount? -> fstatfs magic number returns `0x1cd1`
2. ptmx inode? -> fstat st_ino == 2
3. right char device? -> fstat is S_IFCHR(`c`), and st_rdev is major:minor `5:2`

It inspects the already opened fd, not the path. Re-checking by path using `stat` would leave a `TOCTOU` gap, the container could swap the object between the check and the use. Inspecting the fd you already hold closes that gap entirely by using `fstat`.
