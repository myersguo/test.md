const fs = require("node:fs");
const path = require("node:path");

function suggest(repoPath) {
  const absolute = path.resolve(repoPath);
  const files = listFiles(absolute, 3);
  const isGo = files.some((file) => file.endsWith(".go") || path.basename(file) === "go.mod");
  const isNode = files.some((file) => path.basename(file) === "package.json");

  const framework = isGo ? "Go `testing`" : isNode ? "the existing package test runner" : "the existing project test framework";
  const unitCommand = isGo ? "go test -v ./..." : isNode ? "npm test" : "<fill in focused unit command>";
  const allCommand = files.some((file) => path.basename(file) === "Makefile") ? "make test" : unitCommand;

  return `---
version: alpha
scope: repository
defaultCommands:
  unit: ${unitCommand}
  smoke: <fill in smoke command>
  all: ${allCommand}
testGeneration:
  defaultMode: diff
  requireImpactAnalysis: true
  requireSmokeContract: true
---

# TEST.md

## Testing Model

Describe the repository's unit, integration, e2e, and smoke test layers. State which layers are required for API, persistence, shared helper, and bug-fix changes.

## Test Technologies

Use ${framework}. Do not introduce a new testing framework unless this file is updated to allow it.

## Test Generation Modes

Use diff generation for commits and MRs, full generation for broad module requests, impact generation for shared code changes, and regression generation for reproducible bugs.

## Smoke Test Contract

Smoke tests must cover the lightest meaningful public capability. /ping is sufficient only for health-route or bootstrap changes.

## Quality Gates

- Public API or schema changes require entrypoint-level coverage.
- Shared helper changes require impact analysis.
- New test directories must be included in the aggregate test command.

## Commands

- Unit: \`${unitCommand}\`
- Smoke: \`<fill in smoke command>\`
- All: \`${allCommand}\`
`;
}

function listFiles(root, maxDepth) {
  const results = [];
  walk(root, 0, maxDepth, results);
  return results;
}

function walk(current, depth, maxDepth, results) {
  if (depth > maxDepth) return;
  let entries = [];
  try {
    entries = fs.readdirSync(current, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const next = path.join(current, entry.name);
    if (entry.isDirectory()) {
      walk(next, depth + 1, maxDepth, results);
    } else {
      results.push(next);
    }
  }
}

module.exports = {
  suggest,
};
