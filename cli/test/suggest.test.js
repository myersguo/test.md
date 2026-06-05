const test = require("node:test");
const assert = require("node:assert/strict");
const { suggest } = require("../src/suggest");

test("suggest emits a starter TEST.md", () => {
  const output = suggest(".");
  assert.match(output, /# TEST\.md/);
  assert.match(output, /## Testing Model/);
  assert.match(output, /## Smoke Test Contract/);
  assert.match(output, /defaultMode: diff/);
});
