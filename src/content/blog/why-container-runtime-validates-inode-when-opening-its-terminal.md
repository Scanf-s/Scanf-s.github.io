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

INODE has `object type`, `authority`, `owner uid/gid`, `size`, `timestamp`, `# of hardlings`, `location of data block`, and `unique inode number within the filesystem`.

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

asdfasdfasdf...

### statfs/fstatfs system call

### Device file and major/minor number

### CVE-2025-52565
