const path = require("node:path");
const { lintFile, summarizeDiagnostics } = require("./lint");
const { diffFiles } = require("./diff");
const { suggest } = require("./suggest");

async function main(argv) {
  const [command, ...args] = argv;

  switch (command) {
    case "lint":
      return runLint(args);
    case "diff":
      return runDiff(args);
    case "suggest":
      return runSuggest(args);
    case "spec":
      return runSpec();
    case "-h":
    case "--help":
    case undefined:
      return runHelp();
    default:
      console.error(`Unknown command: ${command}`);
      runHelp();
      process.exitCode = 1;
  }
}

function runLint(args) {
  const target = args[0];
  if (!target) {
    throw new Error("Usage: testmd lint TEST.md");
  }

  const diagnostics = lintFile(target);
  for (const item of diagnostics) {
    console.log(`${item.level.toUpperCase()} ${item.code}: ${item.message}`);
  }

  const summary = summarizeDiagnostics(diagnostics);
  console.log(`lint: ${summary.errors} error(s), ${summary.warnings} warning(s)`);
  if (summary.errors > 0) {
    process.exitCode = 1;
  }
}

function runDiff(args) {
  const [before, after] = args;
  if (!before || !after) {
    throw new Error("Usage: testmd diff TEST-before.md TEST.md");
  }

  const changes = diffFiles(before, after);
  if (changes.length === 0) {
    console.log("No watched TEST.md policy changes found.");
    return;
  }

  for (const change of changes) {
    if (change.type === "frontMatter") {
      console.log(`frontMatter ${change.name}: ${formatValue(change.before)} -> ${formatValue(change.after)}`);
    } else {
      console.log(`section ${change.name}: ${change.change}`);
    }
  }
}

function runSuggest(args) {
  const repo = args[0] || ".";
  console.log(suggest(repo));
}

function runSpec() {
  const specPath = path.resolve(__dirname, "../..", "docs/spec.md");
  console.log(`TEST.md specification: ${specPath}`);
}

function runHelp() {
  console.log(`Usage: testmd <command> [args]

Commands:
  lint TEST.md                 Validate a TEST.md document
  diff TEST-before.md TEST.md  Report watched policy changes
  suggest <repo>               Print a starter TEST.md draft
  spec                         Print the local specification path
`);
}

function formatValue(value) {
  if (value === undefined) return "<missing>";
  return JSON.stringify(value);
}

module.exports = {
  main,
};
