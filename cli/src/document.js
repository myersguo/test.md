const fs = require("node:fs");

function readDocument(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return parseDocument(text, filePath);
}

function parseDocument(text, filePath = "<memory>") {
  const frontMatter = parseFrontMatter(text);
  const body = frontMatter ? text.slice(frontMatter.endOffset) : text;
  const headings = parseHeadings(body);

  return {
    filePath,
    text,
    frontMatter: frontMatter ? frontMatter.data : {},
    body,
    headings,
  };
}

function parseFrontMatter(text) {
  if (!text.startsWith("---\n")) {
    return null;
  }

  const end = text.indexOf("\n---", 4);
  if (end === -1) {
    return null;
  }

  const raw = text.slice(4, end);
  return {
    data: parseYamlSubset(raw),
    endOffset: end + "\n---".length,
  };
}

function parseYamlSubset(raw) {
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }

    const indent = line.match(/^ */)[0].length;
    const trimmed = line.trim();
    const match = trimmed.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    const rawValue = match[2] || "";

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].value;
    if (rawValue === "") {
      const child = {};
      parent[key] = child;
      stack.push({ indent, value: child });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }

  return root;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^["']|["']$/g, "");
}

function parseHeadings(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
      if (!match) return null;
      return {
        level: match[1].length,
        title: match[2].replace(/`/g, ""),
        line: index + 1,
      };
    })
    .filter(Boolean);
}

module.exports = {
  parseDocument,
  readDocument,
};
