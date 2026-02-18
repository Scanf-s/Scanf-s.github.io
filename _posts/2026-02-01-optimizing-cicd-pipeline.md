---
layout: post
title: "Optimizing CI/CD Pipeline for Student Council Homepage Backend"
date: 2026-02-01
categories: [Backend, DevOps]
tags: [GitHub Actions, AWS, ECS, ECR, SSM, CI/CD]
---

## Overview

This post is about CI/CD optimization for the `homepage-backend` project.
During service operation, we had repeated problems in key delivery steps

- deployment success verification
- environment-specific image management
- health check timing
- remote command stability

We already had separate pipelines for development and production.
But trigger conditions and verification logic were not fully consistent.
Because of this, incident analysis and recovery took too long.

I redesigned current pipeline based on GitHub Actions, and stabilized AWS integration across ECR, ECS, and SSM.

---

## Goals

1. Standardize deployment automation for dev and prod
2. Detect failures early and find root causes faster
3. Improve image traceability and reproducibility
4. Reduce manual steps and shorten recovery time

---

## What I Changed

### 1. GitHub Actions workflow improvements

I continuously improved `main-cicd.yml` and `develop-cicd.yml`.

- adjusted branch triggers and execution timing
- added `concurrency` to prevent duplicate deployments
- improved `fetch-depth` handling for safer tag/commit-based processing

### 2. Standardized AWS deployment path

- configured AWS OIDC authentication with `configure-aws-credentials`
- automated ECR login and Docker Buildx (arm64) build/push
- standardized ECS task definition update and service deployment
- added explicit remote deploy verification with SSM:
  `send-command` + `wait` + `get-command-invocation`

### 3. Better health-check and validation strategy

- split health checks into clearer stages
- added retry and wait logic
- verified real service response at `/health`, not only command completion
- repeatedly debugged escaping/parsing/command composition issues to improve failure visibility

### 4. Image and runtime environment cleanup

- standardized image tags to `dev_<short_sha>` and `prod_<short_sha>`
- improved Dockerfile and compose usage for env-based image references
- updated workflow action versions (including ECS actions v2)

---

## Results

### Contribution Rate

- CI/CD work period: **2025-04-07 ~ 2026-02-17**
- CI/CD scope contributions (`.github/workflows`, `Dockerfile`, compose/deploy scripts):
  - **71.1%** (**123 / 173** commits)

### Before

- pipeline focused more on running than on verifiable validation
- failure points were harder to detect early
- rollback decisions were slower due to weaker image traceability

### After

- pipeline changed to verifiable automation
- deployment failures are detected earlier inside the pipeline
- SHA-based image tagging made release history and rollback decisions easier
- clear dev/prod deployment standards improved team-level deployment trust

The most important result is operational confidence.
Now we can ship faster with clearer signals and safer recovery.
