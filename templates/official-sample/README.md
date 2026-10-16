# Official sample plugin snapshot

`files/` is a snapshot of [obsidianmd/obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin), copied by the `official-sample` preset. The commit it was taken at is pinned in the repository's `upstreams.json`.

Each file is upstream's committed bytes, stored under its upstream path with a `.vendored` suffix. The suffix keeps the snapshot from acting on this repository: git would read its `.gitignore`, npm never packs a `.gitignore` or an `.npmrc` under its own name, and coding agents would read its `AGENTS.md` as instructions.

Upstream is licensed under 0BSD, Copyright (C) 2020-2026 by Dynalist Inc. Its license text is `files/LICENSE.vendored`, and it is copied into every generated project unchanged.

Refresh it with `npm run sync:official-sample`. Do not edit these files by hand: `npm run sync:official-sample -- --check` fails when they differ from the pinned commit.
