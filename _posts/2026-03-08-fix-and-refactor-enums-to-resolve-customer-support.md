---
layout: post
title:  "Backend application fix & refactor task for customer service"
date:   2026-03-08 09:00:00 +0900
categories: [Backend]
tags: [Backend, Spring Boot]
---

## Introduction

As our university semester starts, student committees also begin their work, such as holding conferences with university managers or organizing several events for students.

Recently, our university moved the software department and information security department from `IT school` to `AI school`. To create accounts for the new `AI school` student committee, we needed to add new ENUMs and remove the deprecated `IT school` values from our backend system.

Also, some existing `central operational` student committee accounts had a problem when trying to create conference result posts. This was caused by an ENUM mismatch between the frontend and backend services.

---

## Goals

- Create new `AI school` accounts in our backend system and give them to the AI school committee members.
- Migrate the existing `IT school`'s `software department` and `information security department` into `AI school`.
- Make sure the new `AI school` accounts work correctly without any errors when members try to post.
- Fix the issue so that `central operational` student committee members can write posts without ENUM mismatch errors.
- Add a new API endpoint that returns the current ENUM names from the backend. This will keep the frontend always up to date when ENUMs change.
- Remove the enum type from the database column to reduce the management effort, and move all validation into the backend application.
- Migrate all existing `IT School`'s `Software department` and `Information security department` users to `AI School` in the database.

---

## Solutions

### 1. Updating ENUMs and issuing accounts

The first step was to update the backend ENUMs to match the university's current structure. We renamed `SOFTWARE_ENGINEERING_DEPARTMENT` to `AI_SOFTWARE_ENGINEERING_DEPARTMENT` to reflect the department's new name. We also found that some committee roles for `AI school` and `자유전공학부` were missing from `MemberCode`, so we added the four missing values:

- `AI_SCHOOL_ELECTION_COMMITTEE` (AI대학선거관리위원회)
- `CONVERGENCE_DEPARTMENT_ELECTION_COMMITTEE` (자유전공학부선거관리위원회)
- `AI_SCHOOL_AUDIT_COMMITTEE` (AI대학감사위원회)
- `CONVERGENCE_DEPARTMENT_AUDIT_COMMITTEE` (자유전공학부감사위원회)

After the ENUM updates, we created the new AI school accounts and set up the proper records in both the development and production databases.

### 2. Syncing ENUM values with the frontend team

Just updating the backend was not enough. We also needed to make sure the frontend was using the same ENUM values. We talked through Discord to check and match the values used on both sides, even though it was the weekend. Our ITSupport team is enthusiastic about solving problems and always eager to help our customers.

> Cropped the head of the image due to personal information
![image1](/assets/img/posts/2026-03-08-fix-and-refactor.png)

To help the frontend team work more independently, I also created an ENUM reference page on Notion. This way, frontend developers can check the current values at any time without asking the backend team.

![image2](/assets/img/posts/2026-03-08-fix-and-refactor_2.png)

### 3. Adding a Category Enum API endpoint

While Notion documentation is helpful, having an API to get ENUM values is more reliable and keeps the frontend in sync automatically. I added a new REST API endpoint that returns all available `Category` and `FileCategory` codes in one response.

```java
@GetMapping("...")
public ResponseEntity<ApiResponse<?>> getAllCategoryEnums() {
    var result = postCategoryService.getAllCategoryEnums();
    return ApiResponse.success(result);
}
```

This endpoint also supports filtering `FileCategory` by `majorCategory`, `middleCategory`, and `subCategory` query parameters, so the frontend can get only the codes it needs for a specific board.

I also added unit tests for `PostCategoryController` and `PostCategoryService` to make sure the filtering and response format stay correct when ENUMs change.

### 4. Removing the ENUM type constraint from the database column

Before this change, the `file_category` column in the database was defined as a native enum type. This meant that every time we added or renamed a `FileCategory` ENUM value, we also had to change the database schema. This was error-prone and could cause problems during deployment.

To fix this, I changed the column type to `VARCHAR` and moved all validation into the backend application. Repository interfaces that used to accept a `FileCategory` enum parameter were updated to accept a `String` instead:

```java
// Before
void updatePostIdForIds(List<Long> postFileIds, Long postId, FileCategory fileCategory);

// After
void updatePostIdForIds(List<Long> postFileIds, Long postId, String fileCategory);
```

Now, the only place to manage valid ENUM values is the backend code. The database no longer needs schema changes when ENUMs are updated.

### 5. Fixing the FileCategory filtering hierarchy bug

After adding the filtering API, I found a logic bug. If someone sent only a `subCategory` value without providing `majorCategory` or `middleCategory`, the filter would return wrong results without showing any error.

I added a validation rule: `majorCategory` must be provided before `middleCategory`, and `middleCategory` must be provided before `subCategory`. If this rule is broken, the API returns an error using the new `InvalidCategoryFilterHierarchy` exception.

```java
private void validateCategoryFilterHierarchy(String major, String middle, String sub) {
    if (major == null) {
        if (middle != null || sub != null) {
            throw new InvalidCategoryFilterHierarchy(INVALID_HIERARCHY);
        }
    } else if (middle == null) {
        if (sub != null) {
            throw new InvalidCategoryFilterHierarchy(INVALID_HIERARCHY);
        }
    }
}
```

Unit tests for `FileCategoryTest`, `PostFileMapperTest`, and `PostFileAppenderTest` were added to cover the filtering logic and mapper behavior.

---

## Summary

This task started as a simple request to create new accounts and the fix the bug while posting some content in our system, but it grew into a bigger cleanup of how the backend manages ENUM values. 

Here are the main results:
- AI school accounts created and verified to work correctly end-to-end.
- `소프트웨어학부` renamed to `AI소프트웨어학부` across all relevant ENUMs.
- Missing committee roles added to `MemberCode`.
- New `GET /data/categories` API added so the frontend can always get up-to-date ENUM codes without manual sync.
- `file_category` column changed from enum type to `VARCHAR` to remove database schema dependency.
- Filtering hierarchy bug fixed with proper validation and unit tests.
