# Contributing

Contributions are welcome! Here's how to get started.

## Prerequisites

- [Node.js](https://nodejs.org/) (latest LTS recommended)
- npm (comes with Node.js)

## Setup

```bash
git clone https://github.com/mnaoumov/create-obsidian-plugin.git
cd create-obsidian-plugin
npm install
```

## Development Workflow

### Build

```bash
npm run build
```

### Commit

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Use the interactive commit prompt:

```bash
npm run commit
```

### Lint

```bash
npm run lint
npm run lint:fix
```

### Format

```bash
npm run format:check
npm run format
```

### Test

```bash
npm run test
```

### Verify the answer space

The 23 questions multiply out to over fifteen billion combinations, so `npm run test` covers every *pair*
of answers and the three `verify:*` scripts go deeper on demand. They are not part of `npm test` because
they take from half a minute to the better part of an hour.

```bash
npm run verify:answer-space   # ~35s: 5M-case sample + a strength-3 interaction pass, no I/O
npm run verify:rendering      # ~40s: renders 265 projects and checks the emitted bytes
npm run verify:projects       # the long one: generates, installs and gates ~50 real projects
```

A fourth script asks a different question — not whether the output is valid, but whether it looks like a
real plugin. It is the only one that reads anything outside this repo:

```bash
npm run verify:fleet-drift    # ~2s: the two obsidian-dev-utils presets against the real plugins
```

Worth knowing:

- **Run `npm run verify:answer-space -- --check-registry` before a release.** It asks the registry about
  every package the generator can declare. A name that resolves to nothing still reaches `package.json`,
  because version resolution falls back to the literal `latest` so that generating offline works — so a
  dead package name only shows up as a failed `npm install` in someone else's project.
- `verify:projects` accepts `--limit=N` for a quick subset and `--keep` to leave failing projects on disk
  for inspection. Both it and `verify:rendering` take `--out=<dir>`; point it somewhere short if Windows
  path lengths bite.
- `verify:answer-space --exhaustive` checks all 15,049,359,360 combinations. It prints its projected cost
  first — on a 12-core machine that is roughly 13 hours.
- `verify:fleet-drift` scans the checkout's parent directory for plugins — anything with both a
  `manifest.json` and a `src/main.ts` — so it only does anything on a machine that has them checked out
  beside this repo. `--fleet <dir>` points it elsewhere. It exits 1 rather than reporting a clean pass
  when it finds none. Every difference it reports has to be either fixed or recorded in
  `fleet-drift-baseline.json` with the reason it is deliberate;
  `npm run verify:fleet-drift -- --print-baseline` prints a skeleton to fill in.

### Look at one combination

Every script above sweeps the space, which is what makes none of them the tool for the question asked
while actually changing a template: *what does this one combination emit?*

```bash
npm run render:case -- preset=enhanced bundler=webpack --show=scripts/dev.ts,scripts/build.ts
```

Bare `question=answer` arguments override individual answers; everything else takes its default. Both
halves are checked against the answer space, so a misspelt question is an error rather than a silent
default. Without `--show` it lists every path the case emitted, and `--out=<dir>` keeps the rendered
project instead of discarding it.

It distinguishes a file that was never emitted from one emitted empty. That is not a nicety: an
unresolved partial writes the file **empty** rather than failing, and an empty `.ts` compiles.

## Pull Requests

- Base your PR on the `main` branch.
- Ensure all checks pass (`lint`, `format:check`, `test`).
- Use [Conventional Commits](https://www.conventionalcommits.org/) for your commit messages.

