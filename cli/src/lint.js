const path = require("node:path");
const { readDocument } = require("./document");

const REQUIRED_SECTIONS = [
  "Testing Model",
  "Test Technologies",
  "Test Generation Modes",
  "Smoke Test Contract",
  "Quality Gates",
  "Commands",
];

const KNOWN_TOP_LEVEL_FIELDS = new Set([
  "version",
  "scope",
  "defaultCommands",
  "coverage",
  "failurePolicy",
  "testDataPolicy",
  "testGeneration",
]);

function lintFile(filePath) {
  return lintDocument(readDocument(filePath));
}

function lintDocument(document) {
  const diagnostics = [];
  const basename = path.basename(document.filePath);

  if (basename === "test.md") {
    diagnostics.push(warn("filename.legacy", "`test.md` is a legacy alias; use canonical `TEST.md`."));
  } else if (basename !== "TEST.md") {
    diagnostics.push(warn("filename.nonCanonical", "TEST.md specs should use the canonical filename."));
  }

  for (const field of Object.keys(document.frontMatter)) {
    if (!KNOWN_TOP_LEVEL_FIELDS.has(field)) {
      diagnostics.push(warn("frontMatter.unknown", `Unknown front matter field: ${field}.`));
    }
  }

  if (!document.frontMatter.version) {
    diagnostics.push(error("frontMatter.version", "Missing front matter field: version."));
  }

  const headingTitles = new Set(document.headings.map((heading) => heading.title));
  for (const section of REQUIRED_SECTIONS) {
    if (!headingTitles.has(section)) {
      diagnostics.push(error("section.missing", `Missing required section: ${section}.`));
    }
  }

  requireBodyPattern(document, diagnostics, "AGENTS.md", "discovery.agents", "Document should describe AGENTS.md discovery.");
  requireBodyPattern(document, diagnostics, "diff", "generation.diff", "Document should describe diff-based test generation.");
  requireBodyPattern(document, diagnostics, "impact", "generation.impact", "Document should describe impact-based test generation.");
  requireBodyPattern(document, diagnostics, "smoke", "smoke.contract", "Document should define smoke test expectations.");

  return diagnostics;
}

function requireBodyPattern(document, diagnostics, pattern, code, message) {
  if (!document.body.toLowerCase().includes(pattern.toLowerCase())) {
    diagnostics.push(error(code, message));
  }
}

function error(code, message) {
  return { level: "error", code, message };
}

function warn(code, message) {
  return { level: "warn", code, message };
}

function summarizeDiagnostics(diagnostics) {
  const errors = diagnostics.filter((item) => item.level === "error").length;
  const warnings = diagnostics.filter((item) => item.level === "warn").length;
  return { errors, warnings };
}

module.exports = {
  lintDocument,
  lintFile,
  summarizeDiagnostics,
};
