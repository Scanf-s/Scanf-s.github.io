---
layout: post
title:  "Building a Single Sign-On (SSO) System: Our Journey with AWS Cognito"
date:   2025-12-05 19:00:00 +0900
categories: Backend
tags: [AWS, Golang, Python, SSO]
---

# Overview

The ITSupport team at Soongsil University manages a wide variety of digital projects. 
From community boards to event management systems, we have a lot going on. 
However, every time we started a new project, we hit the same wall

> we had to build a brand-new login system from scratch for every single application.

Writing this authentication code again and again was not just a waste of time. It has also a security risk. 
If a developer made even a small mistake with security—like incorrectly managing JWT (JSON Web Tokens),
it could lead to serious vulnerabilities. 

To stop this cycle and make our apps much safer, we decided to build a Single Sign-On (SSO) system. 
With SSO, a user only needs to remember one account to access every service we provide.

---

# Problems

> Building an SSO system is harder than it looks. We faced two main challenges

## 1. Should we build our own SSO service?

Creating a custom login service is a massive engineering task. 
It means we have to become an "Identity Provider" (IdP), similar to how Google or GitHub works. 
This brings heavy responsibilities!

- `Big Security Risks`: An SSO server is a "Single Point of Failure." If it gets hacked, every single connected service is in danger. We would have to build defenses against complex attacks like CSRF (tricking users into taking actions) and XSS (injecting malicious scripts).

- `Complex International Rules`: Following standards like OAuth2 and OIDC is very difficult for a student team. These protocols have many "rules" that must be followed perfectly to keep data safe.

- `Managing Secret Keys`: We would have to handle "Asymmetric Cryptography" to sign tokens. This means managing secret keys and rotating them regularly. One small mistake in this process could break the login for every user at once.

## 2. Syncing Data Between Cognito and Our Database

We already had a user table in our AWS RDS (Database) from previous projects. If we moved to AWS Cognito, we would suddenly have user data living in two different places.

This created two big questions:

- `Linking Identifiers`: Cognito gives users its own ID numbers, but our database has its own "Primary Keys." How do we connect "User A" in Cognito to the correct row in our RDS table?

- `Staying in Sync`: When a new student joins through Cognito, how do we make sure they are automatically and correctly added to our internal database? We couldn't afford to have missing data.

---

# Solutions

## 1. Choosing AWS Cognito

We carefully compared two options. 
Building our own custom server using a library like `Authlib`, or using a managed service from `AWS`.

In the end, we chose `AWS Cognito`. 
For a team of our size, it is very cost-effective because of the AWS Free Tier. 
More importantly, AWS handles all the difficult security work. 
This allows our team to stop worrying about hackers and focus on building cool features that students actually use.

## 2. The Hybrid Way to Sync User Data

> To make sure our RDS database and Cognito stayed perfectly in sync, we used AWS Lambda Triggers. 
> We designed a `Hybrid` strategy that changes its behavior depending on what the user is doing.

![image2](https://github.com/user-attachments/assets/26ef13cf-3de6-4705-b84a-1c5d84799d26)

![image3](https://github.com/user-attachments/assets/eea74150-a3d7-4eac-878e-3965d8d7a458)

### Sign-Up: Synchronous way

> When a user signs up using a social provider, the logic is different depending on the platform:

- `Kakao Login`: Many students already have records in our RDS associated with their Kakao Identity. 
If the Kakao ID already exists in our database, the Lambda updates that record with the new cognito_sub. 
This links the old account with the new SSO system. If the user is new, we create a completely new record in the RDS.

- `Google Login`: For Google users, we simply create a new user record in the RDS and save the cognito_sub.

> This logic ensures that every user in Cognito is perfectly mapped to a userId in our database. 
> We also store the RDS userId in a Cognito Custom Attribute, so it is included in the JWT token for all our apps to use.

### Sign-In: Asynchronous way

When an existing user logs in, we usually just want to update minor things, like their "last login time." 
This doesn't need to be perfect right away.

We use a Lambda function that sends a quick message to AWS SQS (a waiting line for data) and finishes instantly.
The user is logged in immediately without waiting for the database to finish its update. 
This keeps the login experience fast and smooth.

### Connecting the Networks Safely

Our database is hidden in a `Private Subnet` to keep it safe from the public internet.  
To let our login functions talk to the database securely, we used a feature called VPC Peering.

- `Separate Network`: We built a dedicated `Auth VPC` just for our login functions.

- `The Private Bridge`: We connected this `Auth VPC` to our `Database VPC` using a private bridge (VPC Peering).

- `Digital Gatekeepers`: We used Security Groups to ensure that only our specific login functions are allowed to cross the bridge and talk to the database. No one else from the outside can get in.

---

# Result

## AWS Architecture

![Architecture](https://github.com/user-attachments/assets/669ad050-0216-49a9-aaf9-8a3052b91f31)

## API response time

### Sign up process response time

### Sign in process response time

---
