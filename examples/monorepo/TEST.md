---
version: alpha
scope: repository
defaultCommands:
  smoke: make test-smoke
  all: make test
failurePolicy: fix-related
testDataPolicy:
  allowNetwork: false
  allowInProcessHTTP: true
  allowSnapshots: true
  allowExternalServices: false
testGeneration:
  defaultMode: diff
  requireImpactAnalysis: true
  requireSmokeContract: true
---

# TEST.md

This is a realistic repository-level `TEST.md` for a monorepo named `acme-monorepo`. It contains multiple backend services, frontend packages, shared libraries, and generated contracts.

## Repository Shape

```text
acme-monorepo/
  AGENTS.md
  TEST.md
  Makefile
  shared_agent_api/
  docs_agent_api/
  analysis_agent_api/
    AGENTS.md
    TEST.md
    biz/
    test/
      testutil/
  context_service_api/
    AGENTS.md
    TEST.md
    idl/
    biz/
    test/
      testutil/
  review_agent_web/
    package.json
    TEST.md
  common/
    auth/
    response/
    tracing/
```

The root `AGENTS.md` must include:

```md
## Testing

Before adding, changing, or selecting tests, read the nearest applicable `TEST.md`.
For service requests, prefer the service-level `TEST.md`; otherwise use the repository-level `TEST.md`.
```

## Testing Model

The root file defines discovery, impact, and aggregate command rules. It does not replace service-level details.

Use these layers:

- Service unit tests in each backend service.
- Process-local API/RPC e2e tests inside service `test/e2e/`.
- Service smoke tests inside service `test/smoke/`.
- Frontend component or route tests inside frontend packages when the changed surface is UI.
- Root aggregate tests only when the change spans services or shared libraries.

If a service has its own `TEST.md`, agents must use it for technology, fixtures, commands, and smoke shape. If it does not, use this root file and update the service docs as part of the work when the test task reveals missing service policy.

## Test Technologies

Backend services use Go `testing`. HTTP services prefer `httptest`; Kitex services prefer process-local handler invocation with generated types. Frontend packages use the existing package runner from `package.json`; do not introduce a new runner from root.

Shared libraries under `common/` must be tested both directly and through at least one affected service when behavior is user-visible.

## Test Utilities

Each service owns its own `test/testutil/` package. Root-level shared test utilities are allowed only for repository tooling or truly shared libraries; they must not encode service-specific setup.

Recommended service utility names:

| Service Type | Utility Files | Purpose |
| --- | --- | --- |
| HTTP API | `testutil/http.go`, `testutil/db.go`, `testutil/fakes.go` | process-local router, isolated database, fake downstream clients |
| Kitex RPC | `testutil/rpc.go`, `testutil/fakes.go`, `testutil/idl_contract.go` | typed handler invocation, fake clients, generated contract checks |
| Frontend package | `test-utils/render.tsx`, `test-utils/server.ts` | render helpers and API request stubs using the existing test runner |
| Shared Go library | package-local `*_test.go` helpers or `internal/testutil` | direct helper setup without depending on a service |

Rules:

- Prefer service-local `test/testutil/` over root shared helpers.
- Helpers may create fixtures, local databases, fake clients, and typed request builders.
- Helpers must not contain the only assertion for a behavior change.
- Helpers must not call production credentials, service discovery, or external networks.
- If two services need the same helper, first check whether the behavior belongs in a shared library test instead of a root helper.

## Test Generation Modes

### Full Generate

For a request such as:

```text
为 analysis_agent_api 创建完整 e2e、ut、smoke test
```

Do not test the entire monorepo. Scope to `analysis_agent_api`, read `analysis_agent_api/TEST.md` when present, then build a service-specific matrix. The root only supplies fallback expectations:

- unit coverage for service logic and shared helper use
- entrypoint e2e for API or RPC behavior
- smoke for the changed or critical public capability
- `make test` coverage for new test directories

### Diff Generate

For a request such as:

```text
根据 analysis_agent_api commit f4ee8c95 生成测试
```

Required root workflow:

1. Inspect the commit diff.
2. Group changed files by service or shared library.
3. Read the nearest service-level `TEST.md`.
4. Classify blast radius.
5. Generate tests only for changed behavior and affected services.
6. Run focused service commands first, then root aggregate only if cross-service impact exists.

### Impact Generate

Use impact generation for shared changes, for example:

```text
common/response/error_code.go changes error mapping for permission denied.
```

Trace all services that import the changed package. Add direct common package tests plus service-level public behavior tests for affected APIs or RPC methods.

If impact is uncertain because static imports are dynamic or generated, report the uncertainty and run the safest aggregate command available.

### Regression Generate

For a bug report spanning services, reproduce at the smallest service boundary first. Do not add only a root smoke test unless the bug is root orchestration.

## Impact Analysis

| Changed Path | Scope | Required Action |
| --- | --- | --- |
| `analysis_agent_api/biz/service/...` | service | use `analysis_agent_api/TEST.md` |
| `context_service_api/idl/...` | service entrypoint | IDL contract + RPC e2e + smoke |
| `common/auth/...` | cross-service | direct common tests + affected service tests |
| `review_agent_web/src/...` | frontend package | package tests + route smoke if public |
| root `Makefile` | repository | command smoke and docs update |

When multiple services are affected, final reports must name each service and whether tests were added, existing tests were sufficient, or coverage could not be run.

## Test Type Contracts

Root-level tests should be rare. Prefer service-level tests unless the changed behavior is root orchestration, shared tooling, or repository discovery.

Root smoke may fan out to service smoke commands:

```makefile
test-smoke:
	$(MAKE) -C analysis_agent_api test-smoke
	$(MAKE) -C context_service_api test-smoke
```

Do not use root smoke as a substitute for a feature smoke inside the affected service.

## Smoke Test Contract

Root smoke must prove repository-level adoption and at least one service capability:

- root `AGENTS.md` points to nearest `TEST.md`
- root `Makefile` exposes `test` and `test-smoke`
- each service with a `TEST.md` has a discoverable `AGENTS.md` pointer
- changed service smoke command is wired into its service aggregate command

For a feature change, the service-level smoke must exercise that feature. A root-only `/ping` or file-existence smoke is not valid.

Static root smoke is allowed for repository wiring, but it must check concrete contracts such as command targets, service discovery pointers, IDL method names, route registrations, or package scripts.

## Fixtures, Mocks, and Data

Fixtures belong to the service that owns the behavior. Shared fixtures are allowed only for shared libraries and must not encode service-specific assumptions.

Generated artifacts should be tested through their source contract when possible, such as IDL or schema, not by hand-editing generated files.

## Quality Gates

- Root `AGENTS.md` must lead agents to nearest `TEST.md`.
- Service-level `TEST.md` must be created or updated when a service lacks testing policy and the task adds tests there.
- New service test directories must be included in that service's `make test`.
- Cross-service changes require an impact note and at least one affected public boundary test.
- Root smoke cannot replace service feature smoke.

Reject this weak plan:

```text
For a shared auth change, run make test-smoke at root and add no service-level tests.
```

It misses affected API/RPC behavior and does not prove the changed auth contract.

## Commands

- Root smoke: `make test-smoke`, run from repository root.
- Root aggregate: `make test`, run from repository root.
- Service commands: read the nearest service-level `TEST.md`.

## Reporting

Final reports must include service grouping, generation mode, impact classification, service-level commands run, root commands run if any, and unresolved cross-service risk.
