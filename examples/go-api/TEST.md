---
version: alpha
scope: package
defaultCommands:
  unit: go test -v ./biz/service ./biz/repo ./biz/model
  integration: go test -v ./test/integration/...
  e2e: go test -v ./test/e2e/...
  smoke: go test -v ./test/smoke/...
  all: make test
coverage:
  required: false
  command: go test ./... -coverprofile=/tmp/catalog-api.cover
  minimum: null
failurePolicy: fix-related
testDataPolicy:
  allowNetwork: false
  allowInProcessHTTP: true
  allowSnapshots: false
  allowExternalServices: false
testGeneration:
  defaultMode: diff
  requireImpactAnalysis: true
  requireSmokeContract: true
---

# TEST.md

This is a realistic `TEST.md` for a Go HTTP API service named `catalog_api`. The service exposes product search and product detail endpoints for a retail backend.

## Repository Shape

```text
catalog_api/
  AGENTS.md
  TEST.md
  Makefile
  biz/
    handler/product_handler.go
    model/product.go
    repo/product_repo.go
    service/product_search_service.go
  router/
    register.go
  test/
    fixtures/products.json
    testutil/db.go
    testutil/http.go
    testutil/fakes.go
    testutil/fixtures.go
    integration/product_repo_test.go
    e2e/product_search_e2e_test.go
    smoke/product_search_smoke_test.go
```

`AGENTS.md` must include:

```md
## Testing

Before adding or selecting tests for `catalog_api`, read `TEST.md` in this directory.
```

## Testing Model

Use three local layers:

- Unit tests prove service logic, validation, query option construction, response mapping, and edge cases.
- Integration tests prove repository behavior against the local SQLite test database created by `test/testutil/db.go`.
- Process-local e2e tests start the real router with fake dependencies and call HTTP routes through `httptest`.
- Smoke tests prove the lightest public product capability is usable. They are not health checks.

Local automation must not call production MySQL, Redis, TCC, auth, or downstream product services. Use fakes or local fixtures.

## Test Technologies

Use Go `testing`, `net/http/httptest`, existing `test/testutil` builders, and plain table-driven tests. Do not introduce Ginkgo, Testify, or a new mock framework for a narrow API change.

Use fixtures from `test/fixtures/products.json` when a test needs stable product rows. Inline small request structs in unit tests when fixtures would hide the behavior under test.

SQLite is the local persistence substitute. If MySQL-specific JSON, collation, pagination, or timestamp behavior is involved, add an explicit compatibility helper test or document why local coverage is insufficient.

## Test Utilities

Shared test helpers live under `test/testutil/`. Add a helper only when at least two tests need the same setup or when the setup encodes a real project contract, such as database schema creation or router wiring.

Expected utilities:

| File | Responsibility | Must Not |
| --- | --- | --- |
| `test/testutil/db.go` | create isolated SQLite database, apply schema, insert product fixtures, clean rows by test prefix | hide query assertions or silently ignore insert errors |
| `test/testutil/http.go` | build process-local router with fake dependencies and return `httptest.Server` or `http.Handler` | call production service discovery, auth, Redis, or MySQL |
| `test/testutil/fakes.go` | provide fake pricing, inventory, and recommendation clients with configurable success/error behavior | return one hard-coded success for all scenarios |
| `test/testutil/fixtures.go` | load `test/fixtures/products.json` and expose small fixture builders | mutate global fixture state between tests |

Example helper contracts:

```go
func NewTestDB(t *testing.T) *sql.DB
func SeedProducts(t *testing.T, db *sql.DB, products ...ProductRow)
func NewHTTPHandler(t *testing.T, opts HandlerOptions) http.Handler
func ProductFixture(name string) ProductRow
```

Tests should keep behavior assertions in the test file. `testutil` may set up state and expose fakes, but it must not contain the only assertion that proves the feature.

## Test Generation Modes

### Full Generate

Use full generation when the request is broad, for example:

```text
为 catalog_api 的 product search 创建完整测试
```

Build a matrix for `GET /api/products/search`:

| Area | Required Cases |
| --- | --- |
| Query input | no filters, keyword filter, category filter, price range, combined filters |
| Boundaries | empty keyword, max keyword length, page size 1, max page size, page beyond result set |
| Invalid input | negative page, invalid price range, unsupported sort, malformed category id |
| Persistence | no rows, one row, multiple rows, stable sort, total count |
| Response mapping | product id, title, price, currency, tags, availability |
| Dependency failure | repository error returns stable error code and no partial payload |

Add unit tests for `ProductSearchService.Search`, integration tests for `ProductRepo.Search`, and process-local e2e tests for the route.

### Diff Generate

Use diff generation when a commit or MR is named.

Example diff:

```text
biz/model/product.go adds `InStockOnly bool`
biz/handler/product_handler.go binds `in_stock_only` query param
biz/repo/product_repo.go filters `stock_count > 0`
```

Required tests:

- Handler binding test for `?in_stock_only=true` and omitted param.
- Service unit test proving the option reaches the repository query object.
- Repository integration test proving out-of-stock products are excluded only when the flag is true.
- E2E test proving `GET /api/products/search?in_stock_only=true` returns only available products.
- Smoke test proving the route accepts the new parameter and returns a valid response shape.

Do not create broad unrelated coverage for product detail, category admin, or inventory update paths unless the diff touches them.

### Impact Generate

Use impact generation when shared code changes, such as `biz/model/product_response.go` or `biz/repo/query_builder.go`.

Trace:

- direct callers in handlers and services
- all routes that expose the changed response field
- repository queries that reuse the changed predicate
- pagination and sorting behavior that could change visible output

For a response conversion helper change, add the lowest-level conversion unit test plus one e2e route test for the public API that exposes the field.

### Regression Generate

Use regression generation when a bug or failed request is provided.

Example bug:

```text
Searching category=books&page_size=1 returns total=1 even when there are 3 matching products.
```

First add a failing repository or service test that reproduces the incorrect total. The fix is not complete until the new test fails before the fix and passes after the fix.

## Impact Analysis

Classify each change:

| Change | Blast Radius | Minimum Tests |
| --- | --- | --- |
| Pure service validation | local | focused unit test |
| Query predicate or pagination | module | service unit + repo integration |
| Route param or response shape | entrypoint | binding/unit + process-local e2e + smoke |
| Shared query builder or auth client | cross-system | impacted callers + entrypoint coverage |

If the changed code is used by both search and detail routes, include both in the impact note even if only one needs a new test.

## Test Type Contracts

### Unit Tests

Name files as `*_test.go` next to the package under test. Prefer table tests with explicit expected query options or response values. Do not assert only that no error occurred.

### Integration Tests

Use the local test database helper. Each test must create its own rows with unique product ids. Clean up through the helper; do not rely on test order.

### E2E Tests

Use `test/testutil.NewHTTPHandler`. E2E tests should call real routes through `httptest`, not call handlers directly. Assert HTTP status, stable error code, and the fields changed by the behavior under test.

## Smoke Test Contract

Smoke tests must cover a public capability. For `catalog_api`, the default smoke is:

```text
GET /api/products/search?keyword=book&page=1&page_size=1
```

It must assert:

- the route is registered
- request binding succeeds
- status is `200`
- response contains a list field and pagination metadata
- no production network dependency is required

`GET /ping` is sufficient only when the change is limited to service bootstrap or the health route itself.

For a new query parameter, smoke must include the parameter. For a new response field, smoke must assert the field exists in the response shape, but detailed value semantics belong in unit/e2e tests.

## Fixtures, Mocks, and Data

Use product ids with a test prefix such as `test_product_`. Keep fixture rows small and named after behavior:

- `product_in_stock_book`
- `product_out_of_stock_book`
- `product_in_stock_toy`

Mock downstream recommendation or pricing services only at the service boundary. Do not mock the repository in an integration test.

## Quality Gates

- Public route, query param, or response shape changes require process-local e2e coverage.
- Query changes require normal, empty, boundary, and combined-filter cases.
- New test directories must be included in `make test`.
- Smoke must be capability-level, not `/ping`, unless the change is a health/bootstrap change.
- Tests must not require production credentials, production network, or real downstream services.

Reject this weak plan:

```text
Only add a service unit test and run /ping smoke for an `in_stock_only` query parameter change.
```

It misses request binding, repository filtering, public route behavior, and feature smoke.

## Commands

- Unit: `go test -v ./biz/service ./biz/repo ./biz/model`, run from `catalog_api/`.
- Integration: `go test -v ./test/integration/...`, run from `catalog_api/`.
- E2E: `go test -v ./test/e2e/...`, run from `catalog_api/`.
- Smoke: `go test -v ./test/smoke/...`, run from `catalog_api/`.
- All: `make test`, run from `catalog_api/`.

## Reporting

Final agent reports must include the generation mode, blast radius, test files changed, commands run, failures not caused by the change, and whether this `TEST.md` revealed a missing rule.
