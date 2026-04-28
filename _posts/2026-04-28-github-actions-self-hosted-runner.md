---
layout: post
title:  "Optimizing CI/CD Duration with Self-Hosted Runners in GitHub Actions"
date:   2026-04-28 00:00:00 +0900
categories: [DevOps]
tags: [CI/CD, GitHub Actions, AWS, EC2, ARM64]
---

# CI/CD Pipeline Optimization

In modern software development, the speed of CI/CD pipelines directly impacts development productivity. A slow pipeline delays the feedback loop for code changes, which ultimately slows down the overall delivery velocity.

In this post, I will analyze the structural limitations of GitHub-hosted runners and share how we optimized our build performance by migrating to **AWS EC2-based self-hosted runners**.

## The Problem

Previously, our project relied on the standard GitHub-hosted runners. However, as our development scale expanded, we encountered three major technical and financial bottlenecks:

### 1. ARM64 Build Overhead via QEMU Emulation
Since our production environment runs on AWS Graviton (ARM64), we needed to build Docker images compatible with that architecture. Because GitHub-hosted runners are natively x86_64, we had to use software emulation (e.g., `docker/setup-qemu-action`). This emulation layer introduced massive computational overhead, causing build times to skyrocket.

### 2. Rapid Consumption of Free Quota (2,000 Minutes)
During peak development periods with frequent commits, the combination of high deployment frequency and long build durations (averaging over 15 minutes) quickly exhausted GitHub’s 2,000-minute monthly free tier. Once the limit was reached, all pipelines were halted, posing a significant risk to our deployment schedule.

### 3. Resource Constraints and Variability
GitHub-hosted runners have fixed CPU and RAM allocations. Furthermore, as a shared environment, there is inherent variability in I/O performance. This acted as a performance ceiling for our application, which requires complex compilation processes.

## The Solution

To resolve these issues, we transitioned to a **Native ARM64 environment** by deploying and managing our own **Self-hosted runners**.

### Deploying Self-Hosted Runners on Optimized Architecture

Instead of just managing a generic server, we registered AWS EC2 instances (such as `t4g.small`) that match our production architecture as runners.

* **Native Build Environment**: We eliminated the need for QEMU emulation. By performing **Native Compilation** on the same architecture as the target environment, we enabled the pipeline to utilize 100% of the system's CPU and RAM resources.
* **Optimized Computing Resources**: By analyzing our build load, we selected an appropriate instance type (`t4g.small`) to strike the perfect balance between cost-efficiency and performance.
* **Infrastructure Alignment**: Utilizing internal AWS infrastructure allowed us to benefit from faster Docker layer caching and quicker artifact uploads within the same cloud ecosystem.

## The Result

The quantitative improvements after switching to self-hosted runners are summarized below:

| Metric | GitHub-hosted (QEMU) | Self-hosted (Native ARM64) | Improvement |
| :--- | :--- | :--- | :--- |
| **Avg. Build Duration** | ~15 Minutes | **~4 Minutes** | **~73% Reduction** |
| **Monthly Cost** | Paid Overages | Fixed within EC2 costs | Improved Predictability |
| **Workflow Availability** | Risk of suspension | Unlimited execution | Guaranteed Continuity |

### Conclusion

By optimizing our CI/CD architecture, we reduced the time developers spend waiting for deployment results by **75%**. We successfully eliminated the unnecessary overhead of emulation and secured dedicated resources to ensure pipeline stability. This case reinforces that CI/CD environments must be **aligned** with the production architecture to achieve peak efficiency.
