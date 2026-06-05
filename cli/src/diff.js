const { readDocument } = require("./document");

const WATCHED_PATHS = [
  ["version"],
  ["scope"],
  ["failurePolicy"],
  ["testGeneration", "defaultMode"],
  ["testGeneration", "requireImpactAnalysis"],
  ["testGeneration", "requireSmokeContract"],
  ["testDataPolicy", "allowNetwork"],
  ["testDataPolicy", "allowExternalServices"],
];

const WATCHED_SECTIONS = [
  "File Discovery",
  "AGENTS.md Integration",
  "Test Generation Modes",
  "Impact Analysis",
  "Smoke Test Contract",
  "Quality Gates",
  "Commands",
];

function diffFiles(beforePath, afterPath) {
  return diffDocuments(readDocument(beforePath), readDocument(afterPath));
}

function diffDocuments(before, after) {
  const changes = [];

  for (const pathParts of WATCHED_PATHS) {
    const beforeValue = getPath(before.frontMatter, pathParts);
    const afterValue = getPath(after.frontMatter, pathParts);
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes.push({
        type: "frontMatter",
        name: pathParts.join("."),
        before: beforeValue,
        after: afterValue,
      });
    }
  }

  const beforeSections = new Set(before.headings.map((heading) => heading.title));
  const afterSections = new Set(after.headings.map((heading) => heading.title));

  for (const section of WATCHED_SECTIONS) {
    if (!beforeSections.has(section) && afterSections.has(section)) {
      changes.push({ type: "section", name: section, change: "added" });
    } else if (beforeSections.has(section) && !afterSections.has(section)) {
      changes.push({ type: "section", name: section, change: "removed" });
    }
  }

  return changes;
}

function getPath(object, pathParts) {
  return pathParts.reduce((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return current[key];
  }, object);
}

module.exports = {
  diffDocuments,
  diffFiles,
};
