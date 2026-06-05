# testmd CLI

CLI helpers for the local `TEST.md` specification.

The Markdown specification remains the source of truth. This package only automates checks and starter output that are already described in `../docs/spec.md`.

## Commands

```sh
npm test
node ./bin/testmd.js lint ../examples/go-api/TEST.md
node ./bin/testmd.js diff TEST-before.md TEST.md
node ./bin/testmd.js suggest ..
node ./bin/testmd.js spec
```

## Current Scope

- `lint` validates canonical filename usage, required sections, front matter basics, discovery guidance, generation modes, and smoke contract coverage.
- `diff` reports watched policy changes in front matter and key sections.
- `suggest` prints a starter `TEST.md` draft based on simple repository signals.
- `spec` prints the local specification path.

The CLI does not auto-fix repository tests, infer hidden policy, or replace `AGENTS.md` discovery.
