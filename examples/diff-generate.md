# Diff Generate Case Study

This example shows how an agent should generate tests from a named commit. It is intentionally concrete; copy the structure, not the product names.

## User Request

```text
根据 impact_agent_api commit f4ee8c95 生成 e2e、ut、smoke test，并优化 TEST.md
```

## Repository Context

```text
impact_agent_api/
  AGENTS.md
  TEST.md
  Makefile
  biz/
    handler/impact_handler.go
    model/impact.go
    service/impact_detail_service.go
    repo/impact_repo.go
  test/
    service/
    e2e/
    smoke/
```

The agent must read:

1. root `AGENTS.md`
2. root `TEST.md`, if present
3. `impact_agent_api/AGENTS.md`
4. `impact_agent_api/TEST.md`

If the service-level files are missing, create or update them as part of the work before relying on future agent behavior.

## Example Diff

```diff
commit f4ee8c95

biz/model/impact.go
  + ImpactDetailRequest adds Scene string and IncludeInactive bool
  + ImpactDetailResponse adds AffectedPrompts []PromptImpact

biz/service/impact_detail_service.go
  + filters prompt impacts by scene
  + optionally includes inactive prompt impacts
  + parses prompt metadata stored as JSON

biz/handler/impact_handler.go
  + binds query params scene and include_inactive

router/register.go
  + registers GET /api/impact/detail
```

The changed behavior is not "four files changed." The changed behavior is:

- a new public route exists
- query binding has two new parameters
- service filtering semantics changed
- JSON metadata parsing affects response shape
- inactive records are hidden by default

## Impact Classification

| Behavior | Blast Radius | Why |
| --- | --- | --- |
| route registration | entrypoint | public HTTP path |
| query params | entrypoint | wire contract |
| scene filtering | module | service + repo semantics |
| inactive inclusion | module | default-visible behavior changes |
| metadata JSON parsing | cross-system | persisted JSON dialect and response mapping |

Minimum coverage:

- unit tests for service filtering and metadata parsing
- e2e test through the public route
- smoke test for the new route and parameters
- `Makefile` update if new test directories are introduced

## Test Plan

### Unit Tests

File:

```text
impact_agent_api/test/service/impact_detail_service_test.go
```

Cases:

| Case | Setup | Assert |
| --- | --- | --- |
| filters by scene | active prompts in `risk` and `doc` scenes | only requested scene returned |
| excludes inactive by default | active + inactive records | inactive record absent |
| includes inactive when requested | same records with `IncludeInactive=true` | both records returned |
| metadata JSON parsed | record metadata has prompt id, title, reason | response preserves fields |
| malformed metadata | invalid JSON in one row | stable error or documented skip behavior |
| empty result | no matching rows | empty list and no error |

Assertions must check ids and response fields, not only result length.

### E2E Tests

File:

```text
impact_agent_api/test/e2e/impact_detail_e2e_test.go
```

Use process-local HTTP:

```text
GET /api/impact/detail?target_id=target_1&scene=risk&include_inactive=true
```

Assert:

- HTTP status is `200`
- route is registered
- query params are bound
- response includes `affected_prompts`
- inactive prompt appears only when requested
- unrelated scene prompts do not appear

Do not call the handler directly in this layer.

### Smoke Tests

File:

```text
impact_agent_api/test/smoke/impact_detail_smoke_test.go
```

Smoke request:

```text
GET /api/impact/detail?target_id=smoke_target&scene=risk
```

Assert:

- route is registered
- status is success or a documented validation status from local fixtures
- response body is valid JSON
- `affected_prompts` field exists

`/ping` is not valid smoke for this commit because the diff adds a feature route and query params.

## Commands

Run from `impact_agent_api/`:

```sh
go test -v ./test/service/...
go test -v ./test/e2e/...
go test -v ./test/smoke/...
make test
```

If `make test` does not include the new directories, update the `Makefile`.

## Expected Final Report

The final report should say:

- generation mode: diff
- commit inspected: `f4ee8c95`
- blast radius: entrypoint + module + persisted JSON parsing
- tests added by file
- commands run and pass/fail status
- any validation not run and why
- `TEST.md` lesson, for example "service smoke must cover feature route, not ping"

## Weak Plans To Reject

Reject:

```text
Add only a unit test for impact_detail_service.go.
```

It misses public route behavior and query binding.

Reject:

```text
Add smoke test that calls /ping.
```

It does not prove the new route, new query params, or response shape.

Reject:

```text
Mock JSON metadata parsing in service tests.
```

It hides the persisted-data behavior changed by the commit.
