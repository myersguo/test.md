import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { resolve, dirname, basename, relative } from "node:path";
import { Marked } from "marked";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const OUT = resolve(ROOT, "publish");
const BASE_URL = "/test.md";

const marked = new Marked();

const pages = [
  { src: "README.md", out: "index.html", title: "TEST.md" },
  { src: "docs/spec.md", out: "spec.html", title: "Specification" },
  { src: "examples/go-api/TEST.md", out: "examples/go-api.html", title: "Example: Go API" },
  { src: "examples/kitex-rpc/TEST.md", out: "examples/kitex-rpc.html", title: "Example: Kitex RPC" },
  { src: "examples/monorepo/TEST.md", out: "examples/monorepo.html", title: "Example: Monorepo" },
  { src: "examples/diff-generate.md", out: "examples/diff-generate.html", title: "Case: Diff Generate" },
  { src: "examples/impact-generate.md", out: "examples/impact-generate.html", title: "Case: Impact Generate" },
  { src: "cli/README.md", out: "cli.html", title: "CLI" },
];

const nav = pages.map((p) => ({ href: `${BASE_URL}/${p.out}`, title: p.title }));

function stripFrontMatter(text) {
  if (!text.startsWith("---\n")) return text;
  const end = text.indexOf("\n---", 4);
  if (end === -1) return text;
  return text.slice(end + 4).trimStart();
}

function buildPage(title, contentHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} - TEST.md</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
:root {
  --color-primary: #cc785c;
  --color-primary-active: #a9583e;
  --color-ink: #141413;
  --color-body: #3d3d3a;
  --color-body-strong: #252523;
  --color-muted: #6c6a64;
  --color-muted-soft: #8e8b82;
  --color-hairline: #e6dfd8;
  --color-canvas: #faf9f5;
  --color-surface-soft: #f5f0e8;
  --color-surface-card: #efe9de;
  --color-surface-dark: #181715;
  --color-surface-dark-elevated: #252320;
  --color-on-dark: #faf9f5;
  --color-on-dark-soft: #a09d96;
  --color-accent-teal: #5db8a6;
  --color-success: #5db872;
  --color-error: #c64545;

  --font-display: "Cormorant Garamond", "Times New Roman", serif;
  --font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --rounded-sm: 6px;
  --rounded-md: 8px;
  --rounded-lg: 12px;
  --rounded-xl: 16px;
  --rounded-pill: 9999px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.55;
  color: var(--color-body);
  background: var(--color-canvas);
  -webkit-font-smoothing: antialiased;
}

/* Navigation */
.site-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-hairline);
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.site-nav__brand {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.5px;
  color: var(--color-ink);
  text-decoration: none;
  margin-right: 32px;
}

.site-nav__links {
  display: flex;
  gap: 4px;
  list-style: none;
  overflow-x: auto;
}

.site-nav__links a {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-muted);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: var(--rounded-md);
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

.site-nav__links a:hover,
.site-nav__links a.active {
  background: var(--color-surface-card);
  color: var(--color-ink);
}

/* Hero */
.hero {
  padding: 96px 24px 64px;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.hero h1 {
  font-family: var(--font-display);
  font-size: clamp(36px, 6vw, 56px);
  font-weight: 400;
  letter-spacing: -1.5px;
  line-height: 1.05;
  color: var(--color-ink);
  margin-bottom: 16px;
}

.hero p {
  font-size: 18px;
  color: var(--color-muted);
  line-height: 1.5;
  max-width: 600px;
  margin: 0 auto 32px;
}

.hero__badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  background: var(--color-primary);
  color: #fff;
  padding: 4px 12px;
  border-radius: var(--rounded-pill);
  margin-bottom: 24px;
}

.hero__cta {
  display: inline-block;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  padding: 12px 24px;
  border-radius: var(--rounded-md);
  text-decoration: none;
  transition: background 0.15s;
}

.hero__cta:hover { background: var(--color-primary-active); }

/* Main content */
.content {
  max-width: 820px;
  margin: 0 auto;
  padding: 48px 24px 96px;
}

.content h1 {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 400;
  letter-spacing: -0.5px;
  line-height: 1.15;
  color: var(--color-ink);
  margin: 48px 0 16px;
}

.content h1:first-child { margin-top: 0; }

.content h2 {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.3px;
  line-height: 1.2;
  color: var(--color-ink);
  margin: 40px 0 12px;
  padding-top: 24px;
  border-top: 1px solid var(--color-hairline);
}

.content h2:first-child { border-top: none; padding-top: 0; }

.content h3 {
  font-family: var(--font-body);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-body-strong);
  margin: 32px 0 8px;
}

.content h4 {
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 500;
  color: var(--color-body-strong);
  margin: 24px 0 8px;
}

.content p {
  margin: 0 0 16px;
}

.content a {
  color: var(--color-primary);
  text-decoration: none;
}

.content a:hover { text-decoration: underline; }

.content ul, .content ol {
  margin: 0 0 16px;
  padding-left: 24px;
}

.content li { margin-bottom: 6px; }

.content li > ul, .content li > ol { margin-top: 6px; margin-bottom: 0; }

.content blockquote {
  border-left: 3px solid var(--color-primary);
  padding: 12px 20px;
  margin: 16px 0;
  background: var(--color-surface-soft);
  border-radius: 0 var(--rounded-md) var(--rounded-md) 0;
  color: var(--color-body-strong);
}

.content hr {
  border: none;
  border-top: 1px solid var(--color-hairline);
  margin: 40px 0;
}

/* Code */
.content code {
  font-family: var(--font-mono);
  font-size: 13.5px;
  background: var(--color-surface-card);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--color-body-strong);
}

.content pre {
  background: var(--color-surface-dark);
  color: var(--color-on-dark);
  border-radius: var(--rounded-lg);
  padding: 24px;
  margin: 16px 0;
  overflow-x: auto;
  line-height: 1.6;
}

.content pre code {
  background: none;
  padding: 0;
  border-radius: 0;
  color: inherit;
  font-size: 14px;
}

/* Tables */
.content table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 14px;
  overflow-x: auto;
  display: block;
}

.content thead th {
  text-align: left;
  font-weight: 500;
  font-size: 12px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--color-muted);
  padding: 10px 12px;
  border-bottom: 2px solid var(--color-hairline);
  white-space: nowrap;
}

.content tbody td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-hairline);
  vertical-align: top;
}

.content tbody tr:last-child td { border-bottom: none; }

/* Footer */
.site-footer {
  background: var(--color-surface-dark);
  color: var(--color-on-dark-soft);
  padding: 48px 24px;
  text-align: center;
  font-size: 14px;
}

.site-footer a {
  color: var(--color-on-dark);
  text-decoration: none;
}

.site-footer a:hover { text-decoration: underline; }

/* Responsive */
@media (max-width: 768px) {
  .site-nav { padding: 0 16px; height: 56px; }
  .site-nav__brand { font-size: 18px; margin-right: 16px; }
  .site-nav__links { gap: 2px; }
  .site-nav__links a { font-size: 13px; padding: 4px 8px; }
  .hero { padding: 64px 16px 48px; }
  .content { padding: 32px 16px 64px; }
  .content h1 { font-size: 28px; }
  .content h2 { font-size: 22px; }
  .content pre { padding: 16px; border-radius: var(--rounded-md); }
}
</style>
</head>
<body>
<nav class="site-nav">
  <a class="site-nav__brand" href="${BASE_URL}/">TEST.md</a>
  <ul class="site-nav__links">
    ${nav.map((n) => `<li><a href="${n.href}"${n.title === title ? ' class="active"' : ""}>${n.title}</a></li>`).join("\n    ")}
  </ul>
</nav>
${title === "TEST.md" ? "" : `<div class="content">\n${contentHtml}\n</div>`}
<footer class="site-footer">
  <p>TEST.md Specification &middot; <a href="https://github.com/myersguo/test-md">GitHub</a> &middot; MIT License</p>
</footer>
</body>
</html>`;
}

function buildIndex(contentHtml) {
  const heroHtml = `<section class="hero">
  <span class="hero__badge">ALPHA</span>
  <h1>A testing contract for coding agents</h1>
  <p>TEST.md tells agents how to discover, generate, select, run, and report tests in your repository.</p>
  <a class="hero__cta" href="${BASE_URL}/spec.html">Read the Specification</a>
</section>
<div class="content">
${contentHtml}
</div>`;
  return heroHtml;
}

// Build
mkdirSync(OUT, { recursive: true });
mkdirSync(resolve(OUT, "examples"), { recursive: true });

for (const page of pages) {
  const raw = readFileSync(resolve(ROOT, page.src), "utf8");
  const md = stripFrontMatter(raw);
  const html = marked.parse(md);

  let fullHtml;
  if (page.out === "index.html") {
    fullHtml = buildPage(page.title, "").replace(
      /<\/nav>\n/,
      `</nav>\n${buildIndex(html)}\n`
    );
  } else {
    fullHtml = buildPage(page.title, html);
  }

  const outPath = resolve(OUT, page.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, fullHtml);
}

console.log(`Built ${pages.length} pages to ${relative(ROOT, OUT)}/`);
