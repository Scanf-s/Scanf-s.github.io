---
layout: post
title: "Replacing Custom TokenBucket with Standard RateLimiter in Cadence CLI"
date: 2026-01-17
categories: [Backend, OpenSource]
tags: [Golang, Cadence]
---

# Overview
Recently, I contributed to [Cadence](https://github.com/cadence-workflow/cadence), which is a distributed orchestration engine.  
I helped the task about refactor some old code used for rate limiting.

## Why this change?

Cadence had its own code for rate limiting in a package called `common/tokenbucket`.  
However, this code was old and redundant. The Go standard library (and the extended library `golang.org/x/time/rate`) already provides a very good rate limiter. 

Using standard libraries is better because they are well-maintained and tested by many people.  
So, there was an issue ([#7562](https://github.com/cadence-workflow/cadence/issues/7562)) to replace this custom code.

## My Task

My task was to replace the custom `tokenbucket` in the **Cadence CLI**.
The CLI uses rate limiting for admin commands like `AdminDelete`.

## How I did it

### 1. Replacing the Implementation

I replaced `tokenbucket.New` with `rate.NewLimiter`.  I also used the `Wait(ctx)` method.  
This is a big improvement because `Wait` respects the `context`. If a user cancels the command (like pressing Ctrl+C), the rate limiter stops waiting immediately.

**Before:**
```go
ratelimiter := tokenbucket.New(rps, clock.NewRealTimeSource())
// ...
ratelimiter.Consume(1) // Custom blocking call
```

**After:**
```go
ratelimiter := clock.NewRatelimiter(rate.Limit(rps), rps)
// ...
if err = ratelimiter.Wait(c.Context); err != nil {
    return err
}
```

### 2. Finding a Potential Problem (POC)

While I make a PR for this and from the reviewer, there is a question about: 
> *"What happens if the user provides a negative number for RPS?"*

I did some research (Proof of Concept) to see how Go's `rate.NewLimiter` behaves in edge cases.

#### Test 1: If RPS (Limit) is negative

> Reference: https://cs.opensource.google/go/x/time/+/master:rate/rate.go

I found that if the limit is negative, the first request works because it uses the "burst" tokens.  
But every request after that will calculate a delay of `rate.InfDuration`. This means the process will hang forever!

```go
package main

import (
    "log"
    "golang.org/x/time/rate"
)

func main() {
    log.Println("########### POC: If limit is negative ###########")
    limiter := rate.NewLimiter(-1, 1)

    log.Println("########### 1st trial: Reserve token ###########")
    reserve := limiter.Reserve()
    if !reserve.OK() {
        log.Println("########### Reservation Failed ###########")
    } else {
        delay := reserve.Delay()
        log.Printf("Reserved.... required delay: %v", delay)
    }

    log.Println("########### 2nd trial: Reserve token ###########")
    reserve2 := limiter.Reserve()
    if !reserve2.OK() {
        log.Println("########### Reservation Failed ###########")
    } else {
        delay := reserve2.Delay()
        log.Printf("Reserved.... required delay: %v", delay)
        log.Printf("Is Delay InfDuration?: %v", delay == rate.InfDuration)
    }
}
```

**Result:**
```text
2026/01/14 13:22:28 ########### POC: If limit is negative ###########
2026/01/14 13:22:28 ########### 1st trial: Reserve token ###########
2026/01/14 13:22:28 Reserved.... required delay: 0s
2026/01/14 13:22:28 ########### 2nd trial: Reserve token ###########
2026/01/14 13:22:28 Reserved.... required delay: 2562047h47m16.854775807s
2026/01/14 13:22:28 Is Delay InfDuration?: true
```
The second request waits for **2,562,047 hours**! This is basically a kind of `deadlock`.

#### Test 2: If Burst is negative

If the burst value is negative, the consumer cannot receive any tokens at all.

```go
func main() {
    log.Println("########### POC: If burst is negative ###########")
    limiter := rate.NewLimiter(1, -1)

    log.Println("########### 1st trial: Reserve token ###########")
    reserve := limiter.Reserve()
    if !reserve.OK() {
        log.Println("########### Reservation Failed ###########")
    }
}
```

**Result:**
```text
2026/01/14 13:58:20 ########### POC: If burst is negative ###########
2026/01/14 13:58:20 ########### 1st trial: Reserve token ###########
2026/01/14 13:58:20 ########### Reservation Failed ###########
```

### 3. Adding Validation

Because Go's standard library doesn't have internal validation for positive values, I added a check in the Cadence CLI code. This prevents the "hanging" behavior if a user enters a wrong value.

```go
rps := c.Int(FlagRPS)
if rps <= 0 {
    return commoncli.Problem("Required positive value of FlagRPS for ratelimiter but got: ", rps)
}
```

## Result

The changes were merged in PR [#7585](https://github.com/cadence-workflow/cadence/pull/7585). 

**What I achieved:**
*   **Cleaner Code:** I removed the old custom `tokenbucket` from the CLI.
*   **Standardization:** `Cadence` is now use the standard `golang.org/x/time/rate` in `AdminDelete`.
*   **Safety:** The CLI is now protected from deadlocks caused by invalid RPS values.

It was a great experience to contribute and learn about these small but important details in Go!