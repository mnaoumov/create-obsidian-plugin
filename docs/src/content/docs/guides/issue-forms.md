---
title: Issue forms and Report a bug
description: The GitHub issue forms the Bug & Feature answer adds, and the Report a bug command that opens them prefilled.
sidebar:
  order: 8
---

The **`GitHub` issue templates** question (`--gitHubIssueTemplates=bug-and-feature`) gives your plugin's repository `GitHub` issue forms instead of blank issues.

## The forms

`.github/ISSUE_TEMPLATE/` gets three files:

- `bug_report.yml`, the **Bug report** form, titled `[BUG] ...` and labelled `bug`. It asks for a description, the steps to reproduce, the expected and actual behavior, the plugin version, the Obsidian version, the operating system and environment, attachments, a video, a sample vault and a bug isolation check, and ends with confirmations. The video and the sample vault are strongly encouraged but optional, because a form that demands both loses reports from people who will not record and package one;
- `feature_request.yml`, the **Feature request** form, titled `[FR] ...` and labelled `enhancement`. It asks for a description, the details, the desired and current behavior, and optional attachments, with its own confirmations;
- `config.yml`, which turns blank issues off and sends questions to the repository's Discussions instead.

The README and `CONTRIBUTING.md` each get a **Filing an issue (for AI agents and humans)** section that points at the forms. See [Notes for AI agents](/create-obsidian-plugin/guides/ai-agents/).

## The Report a bug command

On the framework presets, the forms come with a **Report a bug** command. It is [obsidian-lib](https://mnaoumov.dev/obsidian-lib/)'s `OpenBugReportCommandHandler`, registered in `src/plugin.ts`, and it opens the bug form with the plugin version, the Obsidian version and the operating system already filled in. The README tells your users about it:

> To report a bug from inside Obsidian, run the **`My Tool`: Report a bug** command. It opens the bug form with the plugin version, the Obsidian version and your operating system already filled in.

`src/plugin.test.ts` gets a case that loads the plugin and checks the command is registered.

The Standalone preset has no `obsidian-lib`, so it gets the forms but not the command.
