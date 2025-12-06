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
To solve the current inefficient process, we decided to apply a Single Sign-On service to our services

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
Replacing the existing logic, which often relies on `UserService` and `Database lookups`  
with an OAuth2 Resource Server configuration requires significant re-architecting of the security context and filter layers.

## 3. How do we sync the Cognito User Pool and Existing Database User Table?

We maintain our own user table within our RDS instance, which operates independently of the Cognito User Pool.
The challenge lies in linking these two distinct data sources.  

The default JWT payload issued by Cognito does not contain our internal user identifiers, such as the Primary Key from our RDS table.   
Without this identifiable information in the token, there is no direct way to map an authenticated session back to the specific user row in our existing database.

Also, when leveraging AWS Cognito for our main service, we must consider:  
**"How do we synchronize the Cognito User Pool with our RDS user table?"**

A simple answer might be to use a Post-Confirmation Lambda trigger immediately after the Cognito process.  
However, in my case, I have to carefully consider both data integrity and user experience.

Cognito provides Lambda triggers for events before and after authentication.  
Typically, we use a post-process Lambda function to insert or update user data in the RDS user table.  
There are two primary approaches to achieve this:

### 1. Insert and Update in synchronous way

If we adopt a synchronous approach, the user must wait until the RDS task is complete.

**[Pros]**    
This ensures the user is successfully created in the RDS user table, making the service more robust in terms of data integrity.

**[Cons]**  
If the job fails, the user cannot receive tokens from Cognito.  
Furthermore, if the database task is delayed or times out, the user has to wait too long, or the login process might fail entirely.  
This can negatively impact the user experience.

### 2. Insert and Update in asynchronous way

If we use an asynchronous approach, the user doesn't have to wait for the RDS task to finish.  
The Post-Confirmation Lambda sends a message to AWS SQS and returns immediately.  
This allows the user to proceed without waiting for the RDS operation.

**[Pros]**  
It significantly improves the user experience by reducing latency.

**[Cons]**   
However, this method also has disadvantages.  
If a user requests their data immediately after logging in, but the SQS consumer hasn't inserted the data into RDS yet, the user might receive a 404 error despite being signed in.
Also, For a new user, if the consumer task fails, the user record won't exist in the database, tainting data integrity.

---

# Solution

## 1. Implement Single Sign On service

### Option1. Use authlib library in Python, implement custom single sign on server


### Option2. Use AWS Cognito as SSO server

## 2. Migration plan for each backend services

### [ITSupport Student Council Homepage]

### [ITSupport PASSU]

### [ITSupport SSUNNOUNCE]

## 3. User Data Synchronization Strategy using Cognito Post-Confirmation Lambda Triggers using Hybrid Pattern

As we discussed above the problem section, I decided to apply both methods to take advantages from each method and set off the disadvantages each other.  
In `Sign Up` process, the user data must have to be inserted on RDS table, so this process will be executed on sync mode.  
And in `Sign in` process, user don't have to wait RDS response, because it is already in the database, we use async process on this process.  

### Sign Up Process

I configured the Post-Confirmation trigger for the sign-up process to ensure the operation executes synchronously.  
Originally, our RDS instance resided in a private subnet within a separate VPC managed by another project.  
Typically, to connect to this RDS, the Lambda function needs to be located in the same VPC.  
However, I opted for a different approach that separating the authentication VPC from the database VPC to improve project management efficiency.  
To connect these VPCs privately and cost-effectively, I utilized AWS VPC Peering.  

First, I provisioned a dedicated VPC for authentication functions and established a peering connection with the database VPC.  
Then, I implemented the Post-Confirmation Lambda function to insert user data into the RDS user table via this private connection.  
With this setup, AWS Cognito issues tokens only if the RDS insertion succeeds.  
If the task fails, Cognito returns an error to the user.  
**Therefore, this architecture guarantees our user data integrity.**

---

# Conclusion

## AWS Architecture

![Architecture](https://github.com/user-attachments/assets/c08a22cb-7b2a-4a7e-b411-51d01c7f75cc)

---

# Concerns

## Need of Infrastructure refactor

### Comments about current Terraform project

### Infrastructure enhance/migration plan using AWS CloudFormation
