---
version: alpha
scope: package
defaultCommands:
  unit: go test -v ./biz/handler ./biz/service ./biz/convert
  e2e: go test -v ./test/e2e/...
  smoke: go test -v ./test/smoke/...
  all: make test
failurePolicy: fix-related
testDataPolicy:
  allowNetwork: false
  allowInProcessHTTP: false
  allowSnapshots: false
  allowExternalServices: false
testGeneration:
  defaultMode: diff
  requireImpactAnalysis: true
  requireSmokeContract: true
---

# TEST.md

This is a realistic `TEST.md` for a Kitex RPC service named `context_service_api`. The service exposes context-building methods used by agent workflows.

## Repository Shape

```text
context_service_api/
  AGENTS.md
  TEST.md
  Makefile
  idl/context_service.thrift
  kitex_gen/context/service/
  biz/
    handler/context_handler.go
    service/build_context_service.go
    convert/context_response.go
    client/feature_repo_client.go
  test/
    fixtures/context_cases.json
    testutil/rpc.go
    testutil/fakes.go
    testutil/fixtures.go
    testutil/idl_contract.go
    e2e/build_context_e2e_test.go
    smoke/build_context_smoke_test.go
```

`AGENTS.md` must point to this file before any test work:

```md
## Testing

Before adding tests for `context_service_api`, read the nearest `TEST.md`.
```

## Testing Model

Use four local testing layers:

- Handler unit tests validate request checks, error codes, and context propagation.
- Service unit tests validate feature selection, repository client behavior, and aggregation.
- Conversion unit tests validate generated IDL type mapping and response field preservation.
- Process-local RPC e2e tests invoke handlers with generated request/response types, without starting a real cluster service.

Smoke tests prove the method is reachable through a meaningful RPC boundary or, when runtime invocation is too heavy, through a concrete generated-IDL and handler-registration contract.

## Test Technologies

Use Go `testing`, generated Kitex request/response types, and existing `test/testutil` fakes. Do not hand-edit `kitex_gen`. Do not introduce a new mock framework when a local fake client is enough.

IDL is part of the public contract. Changes to `idl/context_service.thrift` require generated type awareness in tests, even when generated files are not committed in the same diff.

## Test Utilities

Shared test helpers live under `test/testutil/`. They should make RPC setup deterministic without hiding business assertions.

Expected utilities:

| File | Responsibility | Must Not |
| --- | --- | --- |
| `test/testutil/rpc.go` | invoke handlers with generated request/response types and test context metadata | start a real cluster service unless the test explicitly needs transport |
| `test/testutil/fakes.go` | fake feature repository, auth, and evidence clients with configurable errors | collapse permission denied, not found, timeout, and empty result into one generic error |
| `test/testutil/fixtures.go` | load context graph fixtures and build small request objects | depend on production project ids or user ids |
| `test/testutil/idl_contract.go` | expose compile-time helpers for generated fields/enums used by tests | replace generated type checks with string matching in generated files |

Example helper contracts:

```go
func InvokeBuildContext(t *testing.T, req *context.BuildContextRequest, opts InvokeOptions) (*context.BuildContextResponse, error)
func NewFakeFeatureRepo(cases ...FeatureCase) *FakeFeatureRepo
func ContextCase(name string) FeatureGraph
func RequireEvidenceTypesField(t *testing.T, req *context.BuildContextRequest)
```

Keep assertions in the test files. `testutil` can provide typed invocation and fake dependencies, but the test must still assert error code, response fields, and changed behavior.

## Test Generation Modes

### Full Generate

For a broad request such as:

```text
为 context_service_api 的 BuildContext 创建完整测试
```

Generate this matrix:

| Area | Required Cases |
| --- | --- |
| Required fields | missing `ProjectID`, missing `FeatureID`, empty `UserID` |
| Normal paths | single feature, multiple linked features, context with repo evidence |
| Boundaries | max feature count, empty evidence list, long feature title |
| Tenant/auth | project mismatch, unauthorized user, read-only project |
| Dependency behavior | feature repo timeout, repo returns not found, partial evidence |
| Response contract | `ContextID`, `FeatureSummary`, `Evidence`, `TraceID`, stable error code |

Use handler tests for validation, service tests for feature aggregation, conversion tests for response mapping, and process-local e2e for public method behavior.

### Diff Generate

Example diff:

```text
idl/context_service.thrift adds `optional list<string> evidence_types`
biz/handler/context_handler.go validates `evidence_types`
biz/service/build_context_service.go filters evidence by type
biz/convert/context_response.go returns selected evidence metadata
```

Required tests:

- IDL/contract test proving generated request type includes `EvidenceTypes`.
- Handler validation test for unsupported evidence type.
- Service unit test proving evidence filtering is applied.
- Conversion test proving selected evidence metadata is preserved.
- Process-local RPC e2e test for `BuildContext` with two evidence types.
- Smoke test proving the method accepts the new field and returns a coarse valid response.

Do not stop at a service unit test; the changed field crosses the wire format.

### Impact Generate

Use impact mode for changes in shared code such as `biz/convert/context_response.go`, `biz/client/feature_repo_client.go`, or IDL enums.

Trace:

- all RPC methods that use the changed converter
- generated request/response fields affected by the change
- client retry or timeout behavior that can change returned errors
- public error code mapping

If `context_response.go` is shared by `BuildContext` and `PreviewContext`, test the converter directly and add one public method test for each method whose response shape changes.

### Regression Generate

For a bug such as:

```text
BuildContext returns success with empty Evidence when feature repo returns permission denied.
```

First add a failing handler or service test that expects the permission error code. Do not fix by accepting empty evidence unless the product contract is changed and this `TEST.md` is updated.

## Impact Analysis

| Change | Blast Radius | Minimum Tests |
| --- | --- | --- |
| Local validation only | local | handler unit |
| Service aggregation logic | module | service unit + handler error mapping |
| IDL field or enum | entrypoint | generated type/contract + RPC e2e + smoke |
| Shared client or converter | cross-system | impacted methods + failure mode |

When generated code changes are present, inspect IDL first. Generated files alone are not enough to understand the contract.

## Test Type Contracts

### Unit Tests

Handler tests must assert error code and message category, not only non-nil error. Service tests must assert selected feature ids and evidence ids, not only response length.

### E2E Tests

Use generated request types and the local handler invoker. The e2e test should exercise the same handler method used by Kitex. It does not need a network listener unless the change is transport-specific.

### Contract Tests

For IDL changes, add a small test or compile-time assertion that references the generated field or enum. This catches cases where an agent edits service logic but forgets code generation or generated type usage.

## Smoke Test Contract

Default smoke for `BuildContext`:

```text
BuildContext(ProjectID="test_project", FeatureID="feature_smoke", UserID="user_smoke")
```

The smoke must assert:

- generated request type can be constructed
- handler invocation reaches the method
- status is success or an expected validation error
- response includes `ContextID` or stable error metadata

Static smoke is allowed only if process-local invocation compiles or initializes a large production dependency graph. In that case, static smoke must check concrete IDL method existence and handler method registration, not just file existence.

## Fixtures, Mocks, and Data

Use `test/fixtures/context_cases.json` for feature graphs with more than two nodes. Inline one-node cases in unit tests.

Fake clients must model error codes, not just boolean success. Permission denied, not found, timeout, and empty result are different behaviors.

## Quality Gates

- IDL changes require contract coverage and public method coverage.
- Error mapping changes require handler-level assertions for stable error codes.
- Shared converter changes require tests for every public method whose response shape changes.
- Smoke must use the changed RPC method when the change is method-specific.
- Do not modify generated code manually to make tests pass.

Reject this weak plan:

```text
Add one BuildContext service test and static smoke that checks idl/context_service.thrift exists.
```

It misses generated type usage, handler validation, public method invocation, and a meaningful smoke contract.

## Commands

- Unit: `go test -v ./biz/handler ./biz/service ./biz/convert`, run from `context_service_api/`.
- E2E: `go test -v ./test/e2e/...`, run from `context_service_api/`.
- Smoke: `go test -v ./test/smoke/...`, run from `context_service_api/`.
- All: `make test`, run from `context_service_api/`.

## Reporting

Report generation mode, IDL or method impact, tests added, commands run, untested runtime dependencies, and whether this file needs an update.
