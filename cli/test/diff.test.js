const test = require("node:test");
const assert = require("node:assert/strict");
const { parseDocument } = require("../src/document");
const { diffDocuments } = require("../src/diff");

test("diffDocuments reports watched front matter changes", () => {
  const before = parseDocument(`---
version: alpha
testGeneration:
  defaultMode: diff
  requireSmokeContract: false
---

# TEST.md
`);

  const after = parseDocument(`---
version: alpha
testGeneration:
  defaultMode: impact
  requireSmokeContract: true
---

# TEST.md
`);

  const changes = diffDocuments(before, after);
  assert.ok(changes.some((change) => change.name === "testGeneration.defaultMode"));
  assert.ok(changes.some((change) => change.name === "testGeneration.requireSmokeContract"));
});

test("diffDocuments reports watched section additions", () => {
  const before = parseDocument("# TEST.md\n");
  const after = parseDocument("# TEST.md\n\n## Quality Gates\n");

  assert.deepEqual(diffDocuments(before, after), [
    { type: "section", name: "Quality Gates", change: "added" },
  ]);
});
