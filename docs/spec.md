---
version: alpha
scope: repository
defaultCommands:
  unit: null
  integration: null
  e2e: null
  smoke: null
  lint: null
  typecheck: null
  build: null
  all: null
coverage:
  required: false
  command: null
  minimum: null
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

# TEST.md Specification

`TEST.md` is an agent-facing testing design specification. It tells coding agents how testing works in a repository, how to generate tests from code changes, which test types are required, and which quality gates must be satisfied.

It is not only a command list. Commands are the execution layer; the main purpose of `TEST.md` is to make test design repeatable and enforceable.

The format follows the same spirit as:

- `AGENTS.md`: repository-local agent instructions, nearest-file precedence, Markdown-first guidance.
- `DESIGN.md`: project-specific design tokens and constraints that shape generated output, not just a list of commands.

## Purpose

Use `TEST.md` to define:

- the project's testing technology and test layers
- how agents generate tests for full modules, commits, merge requests, bugs, and impact areas
- the contract for unit, integration, e2e, smoke, snapshot, fixture, and mock usage
- quality gates required before reporting completion
- commands and reporting format

`TEST.md` should not duplicate general coding rules from `AGENTS.md`. It should contain testing knowledge, testing constraints, and testing gates.

Every real test-writing exercise should be treated as feedback for `TEST.md`. If an agent misses the intended test scope, chooses the wrong smoke shape, cannot discover `TEST.md`, or has to infer project testing technology from scratch, the repository's `TEST.md` is incomplete and should be improved.

## File Discovery

Use `TEST.md` as the canonical filename. The uppercase form matches `AGENTS.md` and makes the file visible as a repository-level agent contract.

`test.md` is allowed only as a legacy or transitional alias. If both `TEST.md` and `test.md` exist in the same directory, `TEST.md` wins and agents should report the duplicate to avoid split instructions.

Place `TEST.md` at the repository root by default. Large monorepos may add narrower `TEST.md` files inside services or packages.

Precedence order:

1. Explicit user instructions in the current conversation
2. Nearest applicable `TEST.md`
3. Nearest applicable legacy `test.md`, when no same-directory `TEST.md` exists
4. Parent `TEST.md` files
5. Parent legacy `test.md` files, when no parent `TEST.md` exists
6. `AGENTS.md`, README, CI config, and package scripts
7. Agent judgment based on current source code

When sources conflict, the higher-precedence source wins. If the conflict changes test correctness or scope, the agent must state the conflict before continuing.

## AGENTS.md Integration

Agent runtimes do not all auto-discover `TEST.md`. Most already discover `AGENTS.md`, `CLAUDE.md`, or similar agent instruction files. Therefore a repository that adopts `TEST.md` must provide a discovery bridge from the agent entrypoint file to `TEST.md`.

When a repository or package already has `AGENTS.md`, it must point agents to the applicable `TEST.md`. If `AGENTS.md` does not exist, create the nearest appropriate agent entrypoint file supported by the local tooling, such as `AGENTS.md` or a symlinked equivalent, and add the testing pointer there.

Recommended `AGENTS.md` entry:

```md
## Testing

Before adding, changing, or selecting tests, read the nearest applicable `TEST.md`.
Use `TEST.md` for test generation mode, test type contracts, smoke requirements, commands, and quality gates.
```

`AGENTS.md` should not duplicate the full testing specification. Duplicating test rules creates stale conflicts; use `AGENTS.md` as the discovery bridge and keep testing details in `TEST.md`.

Adoption gate:

- A repository-level `TEST.md` is not considered adopted until the root agent entrypoint points to it.
- A package/service-level `TEST.md` is not considered adopted until the nearest package/service agent entrypoint points to it, or the root entrypoint clearly states that nearest `TEST.md` files must be read.
- If an agent starts from the repository root and a test request targets a service with no local `AGENTS.md`, the root entrypoint must still lead the agent to the repository-level `TEST.md`.

## File Structure

`TEST.md` has two layers:

1. Optional YAML front matter for machine-readable policy.
2. Markdown sections for human-readable testing knowledge and constraints.

Recommended section order:

1. `Testing Model`
2. `Test Technologies`
3. `Test Generation Modes`
4. `Impact Analysis`
5. `AGENTS.md Integration`, when repository-local discovery needs to be documented
6. `Test Type Contracts`
7. `Smoke Test Contract`
8. `Fixtures, Mocks, and Data`
9. `Quality Gates`
10. `Commands`
11. `Failure Handling`
12. `Reporting`

Older sections such as `Test Selection` and `Test Authoring` are allowed, but a mature `TEST.md` should express test design through the sections above.

For the specification project itself, use this layout:

```text
README.md
docs/
  spec.md
cli/
  package.json
  bin/testmd.js
  src/
  test/
examples/
  go-api/TEST.md
  kitex-rpc/TEST.md
  monorepo/TEST.md
  diff-generate.md
  impact-generate.md
```

`docs/spec.md` is the normative specification for this specification project. Adopted repository `TEST.md` files are normative within their own repositories. Files in `examples/` are non-normative examples unless a section explicitly says otherwise. Examples should demonstrate complete decisions, not partial snippets that require hidden assumptions.

The `cli/` package provides executable helpers for the CLI contract below. It must not become the only source of truth; Markdown remains normative, and CLI behavior should be tested against this document's rules.

## Front Matter Schema

All fields are optional.

```yaml
version: alpha
scope: repository | package | directory

defaultCommands:
  unit: <shell command>
  integration: <shell command>
  e2e: <shell command>
  smoke: <shell command>
  lint: <shell command>
  typecheck: <shell command>
  build: <shell command>
  all: <shell command>

coverage:
  required: <boolean>
  command: <shell command>
  minimum: <number>

failurePolicy: fix-related | report-only | ask-before-fix

testDataPolicy:
  allowNetwork: <boolean>
  allowInProcessHTTP: <boolean>
  allowSnapshots: <boolean>
  allowExternalServices: <boolean>

testGeneration:
  defaultMode: diff | full | impact | regression
  requireImpactAnalysis: <boolean>
  requireSmokeContract: <boolean>
```

Unknown fields should be preserved and ignored by default. A consumer may warn when a field appears to be a typo of a known field.

## Testing Model

Describe the repository's test architecture, not just test commands:

- test layers used by the project
- which layers are fast, slow, flaky, or environment-bound
- which layers are required for each type of code change
- how test files are named and located
- where shared helpers, fixtures, snapshots, and test databases live
- which external systems are forbidden in local automation
- how repository-level defaults are overridden by package or service-specific rules

This section should be concrete enough that an agent can add tests without inventing a local testing style.

In a monorepo, repository-level `TEST.md` must not silently describe only one service. It should either define generic rules that apply to all services, or split service-specific rules into clearly labeled subsections. If a real test request targets a service not covered by the current document, update `TEST.md` before or during the test work.

## Test Technologies

List the actual tools and frameworks used in the project:

- language test framework, such as Go `testing`, Jest, Vitest, Playwright, Pytest, or JUnit
- HTTP or RPC test clients
- database test strategy
- mock or patching framework
- fixture format and location
- snapshot tooling, if any
- coverage tooling

Agents must use existing project technologies unless `TEST.md` explicitly allows introducing a new tool. Adding a new testing framework for a narrow change is not allowed by default.

## Test Generation Modes

Agents must identify the generation mode before creating tests. The mode changes the expected breadth.

### Full Generate

Use when the user asks for broad test coverage for a service, package, module, or feature.

Full generation should produce a test matrix across:

- normal paths
- invalid input
- boundary values
- permission or tenant boundaries
- state transitions
- persistence behavior
- external dependency failure behavior
- observability or async side effects when they are part of the contract

Full generation should inspect public APIs, service methods, data models, existing tests, and known invariants before writing tests.

### Diff Generate

Use when the user names a commit, MR, PR, patch, or changed files.

Diff generation must:

- inspect the diff first
- identify changed public behavior, not just changed files
- map changed behavior to the smallest sufficient unit, integration, e2e, and smoke tests
- include request binding or serialization tests when IDL, API models, route params, query params, or wire formats change
- include regression tests for bug fixes when the failure is reproducible
- avoid unrelated broad test creation

### Impact Generate

Use when the change touches shared utilities, data access, auth, routing, serialization, schema, config, dependency clients, or code paths with non-local effects.

Impact generation must trace:

- direct callers
- public entrypoints
- persistence and query paths
- serialization/deserialization boundaries
- config and environment branches
- downstream code that consumes changed output

The agent should add tests at the lowest layer that proves the changed invariant, plus at least one entrypoint-level test when the behavior is user-facing.

### Regression Generate

Use when the user provides a bug report, failed test, log, production symptom, or reproduction.

Regression generation must first create or identify a failing test that demonstrates the bug. The fix is not complete until that test passes without weakening the assertion.

## Impact Analysis

Before generating tests for a non-trivial change, agents should classify the blast radius:

- `local`: only one function or component, no public contract change
- `module`: affects a package/service behavior
- `entrypoint`: affects an API, route, CLI, job, UI flow, or RPC method
- `cross-system`: affects persistence, queues, caches, external clients, auth, config, or generated schemas

Required minimums:

- `local`: focused unit test or existing focused test update
- `module`: unit test plus relevant integration test if persistence or state is involved
- `entrypoint`: unit or service test plus entrypoint e2e/route/API test
- `cross-system`: impact tests covering affected boundary and failure mode; document any external validation not run

## Test Type Contracts

### Unit Tests

Unit tests prove local behavior and edge cases. They should be deterministic, fast, and isolated from external services.

Unit tests are required when:

- business logic changes
- validation logic changes
- query-building or filtering semantics change
- serialization helpers change
- bug fixes have a local reproducer

### Integration Tests

Integration tests prove collaboration between components such as service + database, handler + service, or repository + query builder.

Use integration tests when:

- persistence, transactions, migrations, or query semantics change
- multiple project-owned components interact
- a mock would hide the real failure mode

### E2E Tests

E2E tests prove behavior through a public entrypoint.

For backend services, `TEST.md` must distinguish:

- process-local e2e: real router/handler/service using in-memory or local test dependencies
- environment e2e: a running service in a real or staged environment
- external-system e2e: real external dependencies

If the shape is not specified, agents should prefer deterministic process-local e2e for local automation.

### Snapshot Tests

Snapshots are allowed only when the repository already uses them for the changed surface or `TEST.md` explicitly permits them. Snapshot tests must not replace assertions for critical business behavior.

## Smoke Test Contract

Smoke tests prove that a critical capability is minimally usable. They are not synonymous with `/ping`.

`/ping` only proves that a route is registered and the service can answer a trivial request. It is sufficient only for bootstrap or health-route changes.

Feature smoke tests should cover the lightest public path for the changed capability:

- new query parameter: route accepts the parameter and returns a valid response shape
- new API field: request or response binding preserves the field
- new route: route is registered and returns expected success or validation error
- new persistence path: create or read path reaches the test database
- new UI filter: control state maps to the expected API parameter
- new job or CLI: command parses config and reaches the first safe execution boundary

Smoke tests should be fast, deterministic, and safe to run in local automation.

For dependency-heavy services, a smoke test may be a static contract test when compiling or starting even the smallest runtime entrypoint pulls a large production dependency graph. Static smoke is allowed only when it validates concrete repository contracts, such as:

- agent discovery chain points to `TEST.md`
- stable test command entrypoints exist
- critical route, RPC, plan, or registration tables contain expected public capabilities
- generated schema or IDL artifacts include the changed public field or method

Static smoke must not be a hollow file-existence check. If static smoke replaces runtime smoke, `TEST.md` must explain why runtime smoke is too heavy and what contract the static smoke proves.

## Fixtures, Mocks, and Data

Define project rules for:

- where fixtures live
- how test data should be named
- how to avoid collisions
- whether snapshots are allowed
- whether network access is allowed
- how local substitute infrastructure differs from production
- which external dependencies must be mocked or faked

When local tests use substitute infrastructure, such as SQLite for MySQL, agents must preserve coverage of dialect-sensitive behavior with explicit compatibility helpers or separate tests. They must not delete the scenario to make tests pass.

## Quality Gates

Quality gates define what must be true before completion.

Recommended defaults:

- The applicable `TEST.md` must be discoverable through the agent entrypoint, such as `AGENTS.md`, before relying on it for future agent behavior.
- Public API, IDL, route, query param, or response shape changes require entrypoint-level coverage.
- Database query changes require tests for normal, empty, boundary, and relevant combined filters.
- Shared helper changes require tests for at least one direct caller or public path when the helper affects user-visible behavior.
- Bug fixes require a regression test when reproducible.
- New test directories require the aggregate command to include them.
- Local test suites must not depend on production credentials or services unless explicitly marked environment e2e.
- When a test task reveals missing discovery, wrong service scope, missing command, or ambiguous smoke expectations, update `TEST.md` as part of the task.
- If runtime smoke is too slow because the smallest target compiles or initializes a large production dependency graph, use and document the lightest valid contract smoke instead of forcing an impractical default.

Coverage percentage is optional. Behavioral coverage of changed contracts is required.

## Commands

List exact commands and the directory where each command should run.

Good command entries:

```md
- Unit tests: `go test -v ./biz/service/impact ./test/service/...`, run from the service root.
- Process-local e2e: `go test -v ./test/e2e/...`, run from the service root.
- Smoke: `go test -v ./test/smoke/...`, run from the service root.
- All local tests: `make test`, run from the service root.
```

Commands should be the execution proof for the contracts above, not a replacement for those contracts.

## Failure Handling

The default `failurePolicy` is `fix-related`.

- `fix-related`: fix failures caused by the current change and report unrelated failures.
- `report-only`: report failure details without changing code.
- `ask-before-fix`: stop and ask before modifying code to address failures.

Agents must not weaken assertions, skip tests, delete coverage, hide errors, or use bypass flags such as `--no-verify` to manufacture a pass.

## Reporting

Final reports should include:

- generation mode used
- changed behavior covered
- test files changed
- commands run and pass/fail status
- tests intentionally not run and why
- remaining risk when validation is incomplete
- lessons that should update `TEST.md`
- whether `TEST.md` itself was updated, and if not, why the task produced no new testing-spec lesson

## Examples

Examples are required for a reusable `TEST.md` specification. They translate the normative rules into concrete repository shapes and reduce agent guesswork.

An example must include:

- the repository or service type it represents
- a concrete product scenario, such as a named API, RPC method, job, or monorepo service
- a representative directory layout
- the expected discovery path from `AGENTS.md` to `TEST.md`
- testing technologies
- test utility conventions, such as `testutil/db.go`, `testutil/http.go`, fake clients, and fixture loaders
- generation-mode guidance for full, diff, impact, and smoke requests
- a realistic test matrix for one concrete feature or change
- examples of weak plans that must be rejected
- commands with working directories
- at least one quality gate that would reject a weak test plan

Recommended examples:

- `examples/go-api/TEST.md`: HTTP API service using Go `testing`, process-local e2e, and behavior-level smoke.
- `examples/kitex-rpc/TEST.md`: Kitex/RPC service with handler/service tests, IDL contract checks, and RPC smoke.
- `examples/monorepo/TEST.md`: repository-level rules with service-specific overrides and nearest-file precedence.
- `examples/diff-generate.md`: commit/MR-based test generation workflow.
- `examples/impact-generate.md`: shared-code impact test generation workflow.

Examples should be detailed enough that an agent can model its own test plan after the case. They should not be minimal skeletons. If an example needs many caveats, split it into a separate example instead of making one generic example ambiguous.

## CLI Contract

The specification is supported by a CLI package, but the normative behavior must remain readable in Markdown. A repository must not require a CLI before agents can follow `TEST.md`.

The CLI package should support these commands:

```text
testmd lint TEST.md
testmd diff TEST-before.md TEST.md
testmd suggest <repo>
testmd spec
```

Command contracts:

- `testmd lint TEST.md`: validate front matter shape, canonical filename usage, required section presence, and whether the document names test technologies, generation modes, smoke contract, quality gates, and commands.
- `testmd diff TEST-before.md TEST.md`: report semantic changes to testing policy, such as stricter gates, changed commands, changed smoke rules, or generation-mode defaults.
- `testmd suggest <repo>`: inspect the repository and propose a draft `TEST.md`; suggestions must be reviewed by an agent or maintainer before adoption.
- `testmd spec`: print or link the current specification version.

The CLI should not:

- infer hidden test policy that is absent from `TEST.md`
- auto-fix repository tests
- replace `AGENTS.md` discovery requirements
- treat examples as normative rules

Current local package commands:

```text
cd cli
npm test
node ./bin/testmd.js lint ../examples/go-api/TEST.md
node ./bin/testmd.js spec
node ./bin/testmd.js suggest ..
```

When CLI behavior and `docs/spec.md` disagree, treat it as a specification or implementation bug. Fix the mismatch instead of silently following the CLI output.

## Versioning

`version: alpha` means the schema and section names can still change based on real repository tests.

Changes that tighten agent behavior should be explicit in the document body, not only in front matter. Examples include requiring `TEST.md` discovery through `AGENTS.md`, rejecting `/ping`-only smoke for feature work, or requiring diff-based impact analysis for commit requests.

When real usage changes the specification, update in this order:

1. Add or refine the normative rule in `docs/spec.md`.
2. Add or update one example that demonstrates the rule.
3. Record whether existing repositories need migration.

## Minimal Example

```md
---
version: alpha
scope: repository
defaultCommands:
  unit: go test -v ./...
  smoke: go test -v ./test/smoke/...
  all: make test
testGeneration:
  defaultMode: diff
  requireImpactAnalysis: true
---

# TEST.md

## Testing Model

Use unit tests for business logic, process-local e2e for public API behavior, and smoke tests for minimal route/capability checks.

## Test Technologies

Use Go `testing`. Use the existing in-memory database helper for local persistence tests. Do not introduce a new framework.

## Test Generation Modes

For commit-based work, inspect the diff first and map tests to changed behavior. For full-generation work, build a test matrix across normal, invalid, boundary, persistence, and failure paths.

## Smoke Test Contract

Smoke tests must cover the changed public capability. `/ping` is only sufficient for health-route or bootstrap changes.

## Quality Gates

API shape changes require request binding coverage and service behavior coverage. New test directories must be included in `make test`.

## Commands

- Unit: `go test -v ./...`
- Smoke: `go test -v ./test/smoke/...`
- All: `make test`
```
