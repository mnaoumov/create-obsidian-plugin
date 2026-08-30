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

## Pull Requests

- Base your PR on the `main` branch.
- Ensure all checks pass (`lint`, `format:check`, `test`).
- Use [Conventional Commits](https://www.conventionalcommits.org/) for your commit messages.

