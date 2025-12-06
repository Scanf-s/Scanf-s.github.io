---
layout: post
title:  "Single Sign On service implementation task"
date:   2025-12-05 19:00:00 +0900
categories: ITSupport
tags: [Infrastructure, Backend]
---

# Overview

The ITSupport team at Soongsil University manages diverse projects with various members in the club.  
Every project has presentation and service layers to handle user requests and provide proper data to clients.  
But when we develop backend applications, we always have to implement authentication logic for each project.  
This consumes a lot of development resources, and inexperienced developers are managing JWT themselves, so security issues always exist.
To solve the current inefficient process, we decided to apply a Single Sign-On (SSO) service to our services

# Problems

## 1. Can We Build Our Own SSO Service?

Implementing an SSO service from scratch is not as simple as it appears.  
It requires us to become an Identity Provider—similar to Google, Apple, or GitHub and centrally manage access across services.  
This brings with it numerous technical hurdles and operational responsibilities.

First, strict security is non-negotiable.  
SSO creates a Single Point of Failure.  
We must be thoroughly prepared for threats like CSRF, XSS, token sniffing, and replay attacks.  
This demands extensive security knowledge and resources, as a breach in the SSO server would be critical for user trust.

Second, complying to standards is challenging.  
Implementing a flawless OAuth2 and OIDC protocol is difficult.  
We need to support various grant types (e.g., Authorization Code, Client Credentials) and implement security measures like PKCE to protect SPA clients from token sniffing.

Third, we need a precise key management system.  
To establish trust, we must handle token rotation, access management, and revocation logic ourselves.  
This involves signing tokens with asymmetric cryptography and regularly rotating keys while maintaining a JWK endpoint for client verification.

Fourth, managing authorization and consent is complex.  
We need to enforce strict scope restrictions for each client.  
Furthermore, we must build a dedicated UI to obtain and manage user consent for accessing personal data.

## 2. If we implement new authentication server, how could we migrate each backend applications to use new authentication server?

Let's assume we have successfully built our own SSO server.  
The question remains: **how do we migrate all existing backend applications to this new system?**

Currently, each application operates as an independent authentication server.  
They contain their own logic to fetch user data from the RDS table, generate JWT payloads, and issue tokens.  

If we leverage an SSO server, these applications no longer need to manage the lifecycle of JWTs.  
Instead, they need to transition into purely validating the tokens provided by the SSO.  
This means backend developers must refactor their codebases to remove the legacy issuance logic and implement a validator using the SSO’s JWK (JSON Web Key).

However, this is not just a matter of deleting a few lines of code.  
In frameworks like Spring Boot, authentication is deeply integrated into the Spring Security Filter Chain.  
Replacing the existing logic, which often relies on ``UserService` and `DB lookups`  
with an OAuth2 Resource Server configuration requires significant re-architecting of the security context and filter layers.

## 3. How do we map the Cognito User Pool and Existing Database User Table?

We maintain our own user table within our RDS instance, which operates independently of the Cognito User Pool.
The challenge lies in linking these two distinct data sources.  

The default JWT payload issued by Cognito does not contain our internal user identifiers, such as the Primary Key from our RDS table.   
Without this identifiable information in the token, there is no direct way to map an authenticated session back to the specific user row in our existing database.

---

# Solution

## 1. Implement Single Sign On service

### Option1. Use authlib library in Python, implement custom single sign on server


### Option2. Use AWS Cognito as SSO server

## 2. Migration plan for each backend services

### [ITSupport Student Council Homepage]

### [ITSupport PASSU]

### [ITSupport SSUNNOUNCE]

## 3. User data mapping plan with using Cognito post-confirmation lambda trigger

### How do we map cognito user pool with current RDS user table that already has lots of users?

### How do we make a connection with RDS that is in another private VPC?

---

# Conclusion

## AWS Architecture

## ITSupport Homepage Backend Migration Result

## PASSU Backend Migration Result

## SSUNNOUNCE Backend Migration Result

---

# Concerns

## Need of Infrastructure refactor

### Comments about current Terraform project

### Infrastructure enhance/migration plan using AWS CloudFormation
