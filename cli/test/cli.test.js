const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("spec prints the local specification path", () => {
  const result = spawnSync(process.execPath, ["./bin/testmd.js", "spec"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /docs\/spec\.md/);
});
