const test = require("node:test");
const assert = require("node:assert/strict");
const { parseDocument } = require("../src/document");

test("parseDocument reads front matter and headings", () => {
  const document = parseDocument(`---
version: alpha
scope: repository
testGeneration:
  defaultMode: diff
  requireImpactAnalysis: true
---

# TEST.md

## Testing Model
`);

  assert.equal(document.frontMatter.version, "alpha");
  assert.equal(document.frontMatter.scope, "repository");
  assert.equal(document.frontMatter.testGeneration.defaultMode, "diff");
  assert.equal(document.frontMatter.testGeneration.requireImpactAnalysis, true);
  assert.deepEqual(
    document.headings.map((heading) => heading.title),
    ["TEST.md", "Testing Model"],
  );
});
