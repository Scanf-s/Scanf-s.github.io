---
layout: post
title:  "Making Our School News Scraper 90% Faster and Simpler"
date:   2025-12-05 19:00:00 +0900
categories: ITSupport
tags: [Backend]
---

# Overview

In December 2025, I fixed a big problem with my project: the SSU Announcement Scraper.  
This tool checks school news and sends alerts to students. For a long time, the old version was slow, expensive, and broke very easily.

To solve this, I performed a major "clean-up."  
I deleted 700 lines of old code and made the system much faster and more reliable.  
Here is a detailed look at how I transformed a "fragile" prototype into a strong service.  

# Problems

>The old version used a "Headless Chrome" browser inside AWS Lambda to visit the school portal.  
>While this worked at first, it was a bad way to build a long-term service because...

## 1.It was too heavy
Running a whole browser just to read a few lines of text uses a massive amount of memory.  
It is like using a big heavy truck to deliver a single small letter.  
Every time the scraper ran, the system had to "start the engine" (Chrome), which wasted resources.

## 2. It was slow and expensive
Because it had to load images, scripts, and styles, it took 30 to 60 seconds to finish.  
In the cloud world (AWS), time is money.  
Long execution times meant higher monthly bills.

## 3. It broke easily (Maintenance problem)
If the school changed just one small thing on their website—like a button color or a table name—the scraper would stop working.  
I had to spend hours every week fixing the code manually just to keep it running.  

## 4. No safety net (No tests)  
I didn't have any automated tests to check if the code was working.  
This meant I only found out about bugs after the service stopped sending news to students.  

---

# Solutions

>The biggest change was stopping the "web scraping" entirely.  
>Instead of looking at the website like a human, I found a way to talk to a server directly using an API called `SSUFID`.

## 1. Cleaning and Organizing the Code

I deleted the messy old code and wrote a new, unified system.

- `Old code`: 700+ lines of messy logic and complicated HTML rules.
- `New code`: Only 200 lines of clean, simple code.

> Result: A 72% reduction in code! It is now much easier for me (or anyone else) to read and understand how the system works.

## 2. Using AWS SSM for Smart Settings

In the past, if I wanted to add a new school department to the scraper, I had to rewrite the code and upload it again.  
Now, I use `AWS Systems Manager (SSM)`.  
This acts like a "Remote Control." I can just change a setting in the AWS dashboard, and the scraper updates itself automatically.  
I don't need to touch the code at all.

## 3. Technical Details

Furthermore, I used three main engineering tricks to make the service truly professional.  

### Go `errgroup`

Checking websites one by one is very boring and slow.  
If you have 10 websites and each takes 3 seconds, that is 30 seconds total.  
I used Go's errgroup to check all websites at the same time (in parallel).

```go
// Checking many websites at once
g, gCtx := errgroup.WithContext(ctx)
for _, url := range cfg.Urls {
    g.Go(func() error {
        // Fetch news from the API concurrently
        apiResponse, err := ssufid_request.SSUFIDRequest(gCtx, url)
        return nil
    })
}
if err := g.Wait(); err != nil {
    log.Printf("Something went wrong during the task: %v", err)
}
```

Because of this "parallel" work, the entire task now takes only less than 3 seconds total (5 API requests), no matter how many websites we add.

```text
2025/12/30 12:53:48 [DEBUG] Fetch announcement data from: https://site1
2025/12/30 12:53:48 [DEBUG] Fetch announcement data from: https://site2
2025/12/30 12:53:48 [DEBUG] Fetch announcement data from: https://site3
2025/12/30 12:53:48 [DEBUG] Fetch announcement data from: https://site4
2025/12/30 12:53:48 [DEBUG] Fetch announcement data from: https://site5
2025/12/30 12:53:48 [DEBUG] Deserialize API response body
2025/12/30 12:53:48 [DEBUG] Deserialize API response body
2025/12/30 12:53:48 [DEBUG] Deserialize API response body
2025/12/30 12:53:48 [DEBUG] Deserialize API response body
2025/12/30 12:53:48 [DEBUG] Deserialize API response body
2025/12/30 12:53:49 [DEBUG] Successfully deserialized API response body
2025/12/30 12:53:49 [DEBUG] Successfully deserialized API response body
2025/12/30 12:53:49 [DEBUG] Successfully deserialized API response body
2025/12/30 12:53:49 [DEBUG] Successfully deserialized API response body
2025/12/30 12:53:50 [DEBUG] Successfully deserialized API response body
```

### Fast search with DynamoDB GSI

We never want to send the same news alert to students twice.  
To prevent this, I added a "Fast Index" called a GSI (Global Secondary Index) to my database.  

Instead of looking through thousands of old news items one by one (which is very slow),  
the code uses the index to quickly ask: "Give me the 100 newest items for this department."  
This "indexed search" is incredibly fast and keeps our database costs very low.

```go
// Fast search using an Index instead of a slow scan
input := &dynamodb.QueryInput{
    TableName:              &cfg.DatabaseName,
    IndexName:              aws.String("TypeSubTypeCreatedAtIndex"),
    KeyConditionExpression: expr.KeyCondition(),
    ScanIndexForward:       aws.Bool(false), // Get newest items first
    Limit:                  aws.Int32(100),
}
```
> Reference: https://docs.aws.amazon.com/ko_kr/code-library/latest/ug/go_2_dynamodb_code_examples.html

### Testing: Mocks and Integration Tests

To make sure the code never breaks, I implemented two levels of testing

#### 1. Unit tests

> I created "fake" versions of the database.  
> This lets me check the logic of my code on my laptop without needing the internet.

```go
//go:build unit
// MockDynamoDBClient is a mock implementation of config.DynamoDBClient interface
type MockDynamoDBClient struct {
	BatchWriteItemFunc func(ctx context.Context, params *dynamodb.BatchWriteItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.BatchWriteItemOutput, error)
	BatchGetItemFunc   func(ctx context.Context, params *dynamodb.BatchGetItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.BatchGetItemOutput, error)
	QueryFunc          func(ctx context.Context, params *dynamodb.QueryInput, optFns ...func(*dynamodb.Options)) (*dynamodb.QueryOutput, error)
}

// BatchWriteItem implements the DynamoDBClient interface
func (m *MockDynamoDBClient) BatchWriteItem(ctx context.Context, params *dynamodb.BatchWriteItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.BatchWriteItemOutput, error) {
	// Mock Logic
}

// BatchGetItem implements the DynamoDBClient interface
func (m *MockDynamoDBClient) BatchGetItem(ctx context.Context, params *dynamodb.BatchGetItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.BatchGetItemOutput, error) {
	// Mock Logic
}

// Query implements the DynamoDBClient interface
func (m *MockDynamoDBClient) Query(ctx context.Context, params *dynamodb.QueryInput, optFns ...func(*dynamodb.Options)) (*dynamodb.QueryOutput, error) {
	// Mock Logic
}

func TestBatchSaveAnnouncements(t *testing.T) {
	t.Parallel()
	testCases := []struct {
		name                string
		mockDynamoClient    *MockDynamoDBClient
		announcements       []dto.ScrapeItem
		announcementSubType string
		expectedError       bool
		validator           func(*testing.T, error)
	}{
		// Test case 1
		{
			name: "Successfully add announcement batch into database",
			mockDynamoClient: &MockDynamoDBClient{
				BatchWriteItemFunc: func(ctx context.Context, params *dynamodb.BatchWriteItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.BatchWriteItemOutput, error) {
					return &dynamodb.BatchWriteItemOutput{}, nil
				},
			},
			announcements: createMockAnnouncements(2),
			expectedError: false,
			validator: func(t *testing.T, err error) {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
			},
		},

		// Test case 2
		{
			...
		},

		// Test case 3
		{
			...
		},

		// Test case 4
		{
			...
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			// Run and validate test cases
		})
	}
}

// createMockAnnouncements is a helper function that generates mock announcements
func createMockAnnouncements(count int) []dto.ScrapeItem {
	items := make([]dto.ScrapeItem, count)
	...
	return items
}
```

#### 2. Integration Tests

> This is the cool part. 
> I used LocalStack and Testcontainers to run a "Fake AWS" inside a Docker container

This allows me to test if the code can actually talk to AWS SSM and DynamoDB correctly.  
For example, my test starts a real container, sets up fake parameters, and checks if the code can read them

```go
func TestLoadConfig_Integration(t *testing.T) {
    ctx := context.Background()
    // Start a real LocalStack container to act like AWS
    container, err := utils.GetTestContainer(ctx)
    if err != nil {
       t.Fatalf("Failed to get test container: %v", err)
    }
    defer container.Terminate(ctx)

    // ... set up fake SSM parameters and check if our code loads them correctly
    appConfig := LoadConfig(ctx)

    if appConfig.DatabaseName != "test-database" {
       t.Errorf("Expected 'test-database', but got '%s'", appConfig.DatabaseName)
    }
}
```

# Results

| Metric | Old Way (Scraping) | New Way (API) | Improvement |
|--------|-------------------|---------------|-------------|
| Time to Finish | 44 seconds | 3 seconds | 93% Faster |
| Lines of Code  | 735 lines | 208 lines | 71% Simpler |
| Reliability | No Tests | Implemented unit/integration tests | 38% Safer |

## Scraper execution time

### Original

<img width="1137" height="408" alt="image" src="https://github.com/user-attachments/assets/106ec7ac-b64c-402d-b579-7bf9bcae76b4" />

### New

<img width="1438" height="457" alt="image" src="https://github.com/user-attachments/assets/8e4dcf59-15d9-4ac8-a98a-c6a4c1bdf3ae" />

## Test coverage

### Original

`0%` (No test cases at all)

### New

> It still needs more test cases to improve the current test coverage!

<img width="887" height="164" alt="image" src="https://github.com/user-attachments/assets/625fd046-d6e0-4b78-bbb2-11129838be54" />

