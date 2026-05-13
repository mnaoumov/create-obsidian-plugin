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

## Pull Requests

- Base your PR on the `` branch.
- Ensure all checks pass (`lint`, `format:check`, `test`).
- Use [Conventional Commits](https://www.conventionalcommits.org/) for your commit messages.

