# Impact Generate Case Study

This example shows how an agent should generate tests when a shared change affects multiple public paths.

## User Request

```text
为 common/response 的错误码映射变更生成影响面测试
```

## Repository Context

```text
acme-monorepo/
  TEST.md
  AGENTS.md
  common/
    response/error_code.go
    response/error_code_test.go
  analysis_agent_api/
    TEST.md
    biz/handler/impact_handler.go
    test/e2e/
    test/smoke/
  context_service_api/
    TEST.md
    biz/handler/context_handler.go
    test/e2e/
    test/smoke/
```

## Example Change

```diff
common/response/error_code.go

- PermissionDenied maps to code 50001 and HTTP 500
+ PermissionDenied maps to code 40301 and HTTP 403

+ ErrorCodeFromRPC maps upstream permission denied to PermissionDenied
```

This is not a local helper-only change. It changes public API/RPC error behavior for every service that uses `common/response`.

## Required Discovery

Read in order:

1. root `AGENTS.md`
2. root `TEST.md`
3. nearest service `TEST.md` for each impacted service
4. existing tests for `common/response`
5. imports and callers of `PermissionDenied` and `ErrorCodeFromRPC`

## Impact Trace

Run static search equivalent to:

```sh
rg "PermissionDenied|ErrorCodeFromRPC|WriteError|ToHTTPStatus" common analysis_agent_api context_service_api
```

Expected impact map:

| Caller | Public Boundary | Risk |
| --- | --- | --- |
| `common/response/error_code.go` | shared library | mapping regression |
| `analysis_agent_api/biz/handler/impact_handler.go` | HTTP API | wrong HTTP status or JSON code |
| `context_service_api/biz/handler/context_handler.go` | RPC method | wrong RPC error metadata |

If another service imports the helper, include it in the report even if no new test is needed.

## Test Plan

### Shared Unit Tests

File:

```text
common/response/error_code_test.go
```

Cases:

| Case | Assert |
| --- | --- |
| PermissionDenied HTTP status | maps to `403` |
| PermissionDenied JSON code | maps to `40301` |
| upstream RPC permission denied | maps to local PermissionDenied |
| unknown upstream error | remains stable default error |

These tests prove the invariant at the lowest layer.

### HTTP Service Impact Test

File:

```text
analysis_agent_api/test/e2e/permission_denied_e2e_test.go
```

Scenario:

```text
GET /api/impact/detail?target_id=forbidden_target
```

Fake dependency returns permission denied.

Assert:

- HTTP status is `403`
- JSON error code is `40301`
- response does not expose internal upstream message
- trace id or request id is still present if that is part of the service contract

### RPC Service Impact Test

File:

```text
context_service_api/test/e2e/permission_denied_e2e_test.go
```

Scenario:

```text
BuildContext(ProjectID="forbidden_project", FeatureID="feature_1")
```

Fake feature repository returns upstream permission denied.

Assert:

- RPC response or error metadata uses local permission denied code
- handler does not convert it to unknown/internal error
- no successful context payload is returned

### Smoke Tests

Smoke does not need to force permission denied in every service unless the changed mapping is the service's primary feature. Required smoke:

- shared static smoke or unit command proving `common/response` tests are wired
- affected service smoke still passes with normal public capability
- if a service added a dedicated permission-denied route fixture, smoke may assert that route returns the new coarse error shape

Do not replace impact e2e tests with smoke.

## Commands

Run focused tests first:

```sh
go test -v ./common/response
make -C analysis_agent_api test-e2e
make -C context_service_api test-e2e
```

Then run aggregate tests when the repository supports them:

```sh
make test
```

If aggregate tests are too expensive or require unavailable infrastructure, report that and include the focused commands that passed.

## Expected Final Report

The final report should say:

- generation mode: impact
- changed shared contract: permission denied mapping
- direct callers and public boundaries inspected
- tests added by service
- commands run
- services intentionally not tested and why
- `TEST.md` updates needed, such as adding shared-library impact rules

## Weak Plans To Reject

Reject:

```text
Only add common/response unit tests.
```

The change is user-visible through services.

Reject:

```text
Run root smoke and declare impact covered.
```

Root smoke does not prove public error mapping.

Reject:

```text
Mock the final JSON error response in handler tests.
```

That bypasses the shared mapper and fails to prove the changed contract.
