---
layout: post
title:  "Single Sign On service implementation task"
date:   2025-12-05 19:00:00 +0900
categories: ITSupport
tags: [Infrastructure, Backend]
---

# Overview

![image](https://github.com/user-attachments/assets/587e12f6-c071-47b1-9783-6146a37c1377)

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

## 2. How do we sync the Cognito User Pool and Existing Database User Table?

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

To solve the problems mentioned above, I evaluated two primary strategies: 
- Building a self-hosted provider using a framework
- Adopting AWS managed service.

### Option 1. Use authlib library in Python, implement custom single sign on server

> [Authlib Document](https://docs.authlib.org/en/latest/)  
> The first option was to build our own Identity Provider (IdP) using Python Authlib.  
This is a powerful library for building OAuth and OpenID Connect servers.

**[Pros]**  
This approach offers complete control over the authentication flow and database schema synchronization.  
We could design the login UI exactly as we wanted and avoid vendor lock-in.

**[Cons]**  
However, as mentioned in the Problems section, this would force us to handle all security aspects like:
- token signing
- key rotation
- CSRF protection
- Compliance with strict OAuth2 standards  

I think, for a student team with limited time and security expertise,  
the risk of implementation errors, and potential security problems was too high.

### Option 2. Use AWS Cognito as SSO server

> [AWS Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html)  
> The second option was to utilize AWS Cognito, a fully managed service solution provided by AWS.

**[Pros]**  
Cognito resolve our concerns about implementing the robust complex OAuth and OIDC logic ensuring standard protocol.    
It provides built-in security features like adaptive authentication, MFA, and automated token management.  
Most importantly, it shifts the responsibility for security and infrastructure maintenance from our team to AWS.  

**[Cons]**  
Customizing the hosted UI is limited, and there is a dependency on the AWS ecosystem (Vendor Lock-in).  
Furthermore, we have to manually synchronize the Cognito user pool with our existing User database.

### Final decision

As my decision, I selected `Option 2`.  
Because our service currently has a low Monthly Active Users (MAU) count, the AWS Free Tier makes this solution cost-effective!  
More importantly, it allows us to focus on our core business logic rather than handling the complexities of authentication security from scratch.

## 2. User Data Synchronization Strategy using Cognito Post-Confirmation Lambda Triggers using Hybrid Pattern

> As discussed in the problem section, synchronizing the Cognito User Pool with our legacy RDS table was a critical challenge.  
> I decided to apply a hybrid approach that combines both synchronous and asynchronous patterns to balance data integrity with user experience.

![image2](https://github.com/user-attachments/assets/26ef13cf-3de6-4705-b84a-1c5d84799d26)

### For Sign-Up (Synchronous)
Data integrity is important when a user is first created.  
Therefore, I configured the `Post-Confirmation Lambda trigger` to execute synchronously.  
When a user sign up, post-confirmation Lambda function is triggered and attempts to insert the user record into our RDS.  
And If the RDS insertion fails, the Lambda returns an error, and Cognito rolls back the sign-up.    
This guarantees that a user exists in Cognito IF AND ONLY IF they exist in our RDS. No ghost users are created.  

### For Sign-In (Asynchronous)
Once a user is successfully registered, subsequent updates (e.g., last login time, profile updates) do not need to block the user's flow.  
For these events, we use an asynchronous pattern via `Post-Authentication Lambda Trigger` with `SQS` to update the RDS without adding latency to the login process.

## 3. Network Architecture for user synchronization
To implement the sign-up/sign-in process securely, I had to solve a network connectivity issue.  
Our RDS instance resides in a private subnet within a separate VPC managed by another project.  

Instead of exposing the database to the public internet or merging VPCs, I leveraged AWS VPC Peering feature.  
- First, I provisioned a dedicated `Auth VPC` for our Lambda functions.
- Second, I established a `Peering Connection` between the Auth VPC and the Database VPC.
- Third, I configured a proper `Security Group` for connectivity and secure insurance.
- Forth, The Post-Confirmation/Post-Authentication Lambda are deployed within the private subnet of the Auth VPC.

> With this setup, the Lambda function securely accesses the RDS instance via a private IP address.  
> This architecture ensures that our database remains isolated from the public internet  
> while allowing the authentication service to maintain strict data consistency.

---

# Result

## AWS Architecture

![Architecture](https://github.com/user-attachments/assets/669ad050-0216-49a9-aaf9-8a3052b91f31)

## API response time

### Sign up process response time

### Sign in process response time

---

# Concerns

## Need of Infrastructure refactor

## NAT Instance High Availability problem
