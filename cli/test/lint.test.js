const test = require("node:test");
const assert = require("node:assert/strict");
const { parseDocument } = require("../src/document");
const { lintDocument } = require("../src/lint");

test("lintDocument accepts a minimal valid TEST.md", () => {
  const document = parseDocument(`---
version: alpha
scope: repository
---

# TEST.md

## AGENTS.md Integration

Read AGENTS.md before TEST.md.

## Testing Model

Use unit, e2e, and smoke tests.

## Test Technologies

Use Go testing.

## Test Generation Modes

Use diff and impact generation.

## Smoke Test Contract

Smoke must cover a meaningful capability.

## Quality Gates

API changes require entrypoint tests.

## Commands

- Unit: \`go test ./...\`
`, "TEST.md");

  assert.deepEqual(lintDocument(document), []);
});

test("lintDocument reports missing required sections", () => {
  const document = parseDocument(`---
version: alpha
---

# TEST.md
`, "TEST.md");

  const diagnostics = lintDocument(document);
  assert.ok(diagnostics.some((item) => item.level === "error" && item.code === "section.missing"));
});

test("lintDocument warns about legacy lowercase filename", () => {
  const document = parseDocument(`---
version: alpha
---

# TEST.md

## Testing Model
## Test Technologies
## Test Generation Modes
diff impact
## Smoke Test Contract
smoke
## Quality Gates
AGENTS.md
## Commands
`, "test.md");

  const diagnostics = lintDocument(document);
  assert.ok(diagnostics.some((item) => item.level === "warn" && item.code === "filename.legacy"));
});
