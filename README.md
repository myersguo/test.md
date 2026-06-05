# TEST.md

`TEST.md` is a Markdown-first testing contract for coding agents. It tells agents how a repository expects tests to be discovered, generated, selected, run, and reported.

This repository defines the `TEST.md` specification and provides examples plus a small CLI helper. Projects that adopt this specification should create their own `TEST.md` file at the repository, package, or service level.

## Read the specification

- Full specification: [`docs/spec.md`](docs/spec.md)
- Example service specs:
  - [`examples/go-api/TEST.md`](examples/go-api/TEST.md)
  - [`examples/kitex-rpc/TEST.md`](examples/kitex-rpc/TEST.md)
  - [`examples/monorepo/TEST.md`](examples/monorepo/TEST.md)
- Generation case studies:
  - [`examples/diff-generate.md`](examples/diff-generate.md)
  - [`examples/impact-generate.md`](examples/impact-generate.md)

## Quick start for adopters

1. Add a `TEST.md` file near the code it governs.
2. Describe the real test layers, technologies, commands, smoke contract, and quality gates.
3. Add an `AGENTS.md` testing pointer so agents know to read the nearest applicable `TEST.md` before test work.

Recommended `AGENTS.md` entry:

```md
## Testing

Before adding, changing, or selecting tests, read the nearest applicable `TEST.md`.
Use `TEST.md` for test generation mode, test type contracts, smoke requirements, commands, and quality gates.
```

## CLI

```sh
cd cli
npm test
node ./bin/testmd.js lint ../examples/go-api/TEST.md
node ./bin/testmd.js suggest ..
node ./bin/testmd.js spec
```

The CLI is a helper only. The Markdown specification remains the source of truth.
