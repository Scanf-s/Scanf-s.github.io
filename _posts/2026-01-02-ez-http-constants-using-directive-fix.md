---
layout: post
title: "Fixing the 'using' Directive Bug and Adding HTTP Status Code Constants in EZ Language"
date: 2026-01-02
categories: [Backend, OpenSource]
tags: [Golang, EZ, Programming Language]
---

# Overview

I contributed to [EZ](https://github.com/SchoolyB/EZ), which is a modern programming language built with Go.
I worked on two related issues: adding HTTP status code constants to the `@http` module (Issue #901) and fixing a bug where the `using` directive did not bring stdlib constants into scope (Issue #909).

## Background: What is the `using` Directive?

In EZ, you can import modules and use them with a namespace prefix:

```ez
import @http

do main() {
    println("${http.OK}")  // Works: 200
}
```

The `using` directive allows you to access module exports without the prefix:

```ez
import @std
using std

do main() {
    println("Hello")  // No need for std.println
}
```

## The Problem

### Issue #901: Need for HTTP Status Code Constants

Users had to use raw integers for HTTP status code comparisons:

```ez
if response.status == 200 {
    // ...
}
```

This is not readable. We wanted to support named constants like:

```ez
if response.status == http.OK {
    // ...
}
```

### Issue #909: `using` Directive Only Works for Functions

After implementing the HTTP constants, we discovered a bigger problem. The `using` directive did **not** bring constants into scope:

```ez
import @http
using http

do main() {
    println("${OK}")        // Error: undefined variable 'OK'
    println("${http.OK}")   // Works: 200
}
```

This bug affected **all** stdlib modules with constants:
- `@http` - OK, CREATED, NOT_FOUND, etc.
- `@os` - MAC_OS, LINUX, WINDOWS
- `@math` - PI, E, PHI, SQRT2
- `@time` - SUNDAY, MONDAY, JANUARY, HOUR, DAY
- `@io` - READ_ONLY, WRITE_ONLY, SEEK_START
- `@db` - ALPHA, NUMERIC, KEY_LEN
- `@uuid` - NIL

## My Solution

I solved both issues with a two-part approach.

### Part 1: Adding HTTP Status Code Constants (#907)

First, I added HTTP status code constants to `pkg/stdlib/http.go`:

```go
const (
    OK                    int64 = 200
    CREATED               int64 = 201
    ACCEPTED              int64 = 202
    NO_CONTENT            int64 = 204
    BAD_REQUEST           int64 = 400
    UNAUTHORIZED          int64 = 401
    FORBIDDEN             int64 = 403
    NOT_FOUND             int64 = 404
    INTERNAL_SERVER_ERROR int64 = 500
    // ... and more
)
```

Then I exposed these as builtins in the `HttpBuiltins` map:

```go
"http.OK": {
    Fn: func(args ...object.Object) object.Object {
        return &object.Integer{Value: big.NewInt(OK)}
    },
},
```

### Part 2: Fixing the `using` Directive Bug (#979)

The core problem was in the **type checker**. It only checked for functions when validating identifiers accessed via `using`, not constants.

**Step 1: Add `IsConstant` flag to all stdlib constants**

I added an `IsConstant: true` flag to distinguish constants from functions:

```go
"http.OK": {
    Fn: func(args ...object.Object) object.Object {
        return &object.Integer{Value: big.NewInt(OK)}
    },
    IsConstant: true,  // Added this flag
},
```

I applied this to all constants across 7 stdlib modules: `db.go`, `http.go`, `io.go`, `math.go`, `os.go`, `time.go`, and `uuid.go`.

**Step 2: Add `isStdlibConstant()` function to type checker**

I added a new function in `pkg/typechecker/typechecker.go` to check if an identifier is a stdlib constant:

```go
func (tc *TypeChecker) isStdlibConstant(moduleName, constName string) bool {
    stdConsts := map[string]map[string]bool{
        "http": {
            "OK": true, "CREATED": true, "BAD_REQUEST": true,
            "NOT_FOUND": true, "INTERNAL_SERVER_ERROR": true,
            // ... all HTTP constants
        },
        "os": {
            "MAC_OS": true, "LINUX": true, "WINDOWS": true,
            "CURRENT_OS": true,
        },
        "math": {
            "PI": true, "E": true, "PHI": true, "SQRT2": true,
        },
        // ... other modules
    }
    if modConsts, ok := stdConsts[moduleName]; ok {
        return modConsts[constName]
    }
    return false
}
```

**Step 3: Update `isKnownIdentifier()` to check constants**

I modified the `isKnownIdentifier()` function to also check stdlib constants when `using` is declared:

```go
// Check if it's a stdlib constant accessible via 'using'
for moduleName := range tc.fileUsingModules {
    if tc.isStdlibConstant(moduleName, name) {
        return true
    }
}
if tc.currentScope != nil {
    for moduleName := range tc.currentScope.usingModules {
        if tc.isStdlibConstant(moduleName, name) {
            return true
        }
    }
}
```

**Step 4: Add unit tests for each module**

I wrote unit tests to verify the fix works for all stdlib constants:

```go
func TestHttpModuleConstantWithoutModuleNamespace(t *testing.T) {
    input := `
import @http
using http

do main() {
    const status_200 int = OK
    const status_404 int = NOT_FOUND
    const status_500 int = INTERNAL_SERVER_ERROR
}
`
    tc := typecheck(t, input)
    assertNoErrors(t, tc)
}
```

## Result

The changes were merged in PR [#907](https://github.com/SchoolyB/EZ/pull/907) and PR [#979](https://github.com/SchoolyB/EZ/pull/979).

**What was achieved:**
- **New Feature:** Users can now use readable HTTP status code constants (`http.OK`, `http.NOT_FOUND`, etc.)
- **Bug Fix:** The `using` directive now correctly brings all stdlib constants into scope
- **Consistency:** Constants now work the same way as functions with `using`
- **Test Coverage:** Added unit tests for all stdlib module constants

**Now users can write clean code like:**

```ez
import @http
using http

do main() {
    temp resp, err = http.get("https://api.example.com")
    if resp.status == OK {
        println("Success!")
    } else if resp.status == NOT_FOUND {
        println("Resource not found")
    }
}
```

This was a great experience contributing to a programming language project and understanding how type checkers validate identifiers!
