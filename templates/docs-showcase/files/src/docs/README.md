# Developer docs showcase

Every code block of the [Obsidian developer docs](https://docs.obsidian.md), taken from [obsidianmd/obsidian-developer-docs](https://github.com/obsidianmd/obsidian-developer-docs) at commit [`1c26772`](https://github.com/obsidianmd/obsidian-developer-docs/tree/1c26772ac13d6e9870c865936d389fdfe694e742). Each runnable block is a command named `Docs: <page> > <heading>`: open the command palette, type `Docs:`, and run it.

114 blocks are runnable. 62 do not compile against the `obsidian` API, and 49 are not plugin code. Both kinds are listed below with the reason, so nothing is dropped silently.

Each module holds the block as the docs show it, plus what create-obsidian-plugin generated around it: the imports the block leaves out, an export list for the blocks after it on the same page, and a `run(context)` function. `host.ts` supplies what the docs leave to the reader: a plugin to register things on, a scratch note to work with, an editor, an element to draw into.

The modules are type-checked by `tsconfig.json` in this folder, which carries the compiler options of the official sample plugin, rather than by the project's own stricter `tsconfig.json`. They are upstream's code, so the project's linter, formatter and spell checker skip this folder.

The code blocks are licensed under 0BSD (code examples of obsidianmd/obsidian-developer-docs, Copyright (C) 2020-2026 Dynalist Inc.). See the [LICENSE](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/LICENSE).

## Community directory > Frequently asked questions

Docs page: <https://docs.obsidian.md/Community+directory/Frequently+asked+questions>

- [block at line 76](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Community%20directory/Frequently%20asked%20questions.md?plain=1#L76) under "Reviews and scanning > Why are my test or development files being included in the scan?": not runnable, a block with no language: plain text, not plugin code.

## Plugins > Editor > Communicating with editor extensions

Docs page: <https://docs.obsidian.md/Plugins/Editor/Communicating+with+editor+extensions>

- [block at line 5](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Communicating%20with%20editor%20extensions.md?plain=1#L5): command `Docs: Communicating with editor extensions`, module `plugins/editor/communicating-with-editor-extensions/01-intro.ts`.
- [block at line 16](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Communicating%20with%20editor%20extensions.md?plain=1#L16) under "View plugin": does not compile, `TS2339: Property 'addPointerToSelection' does not exist on type 'ExamplePlugin'.`, at line 11 of the block (line 27 of the page).
- [block at line 37](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Communicating%20with%20editor%20extensions.md?plain=1#L37) under "State field": command `Docs: Communicating with editor extensions > State field`, module `plugins/editor/communicating-with-editor-extensions/03-state-field.ts`.

## Plugins > Editor > Decorations

Docs page: <https://docs.obsidian.md/Plugins/Editor/Decorations>

- [block at line 60](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Decorations.md?plain=1#L60) under "Providing decorations > Widgets": command `Docs: Decorations > Providing decorations > Widgets`, module `plugins/editor/decorations/01-widgets.ts`.
- [block at line 76](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Decorations.md?plain=1#L76) under "Providing decorations > Widgets": command `Docs: Decorations > Providing decorations > Widgets (2)`, module `plugins/editor/decorations/02-widgets.ts`.
- [block at line 89](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Decorations.md?plain=1#L89) under "Providing decorations > State fields": not runnable, a fragment of an object literal: members shown out of the object they belong to.
- [block at line 95](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Decorations.md?plain=1#L95) under "Providing decorations > State fields": command `Docs: Decorations > Providing decorations > State fields (2)`, module `plugins/editor/decorations/04-state-fields.ts`.
- [block at line 154](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Decorations.md?plain=1#L154) under "Providing decorations > View plugins": command `Docs: Decorations > Providing decorations > View plugins`, module `plugins/editor/decorations/05-view-plugins.ts`.

## Plugins > Editor > Editor extensions

Docs page: <https://docs.obsidian.md/Plugins/Editor/Editor+extensions>

- [block at line 24](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Editor%20extensions.md?plain=1#L24) under "Registering editor extensions": does not compile, `TS2304: Cannot find name 'exampleField'.`, at line 2 of the block (line 26 of the page).

## Plugins > Editor > Editor

Docs page: <https://docs.obsidian.md/Plugins/Editor/Editor>

- [block at line 7](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Editor.md?plain=1#L7): command `Docs: Editor`, module `plugins/editor/editor/01-intro.ts`.
- [block at line 27](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Editor.md?plain=1#L27) under "Insert text at cursor position": does not compile, `TS2349: This expression is not callable.`, at line 10 of the block (line 37 of the page).
- [block at line 54](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Editor.md?plain=1#L54) under "Replace current selection": command `Docs: Editor > Replace current selection`, module `plugins/editor/editor/03-replace-current-selection.ts`.

## Plugins > Editor > Markdown post processing

Docs page: <https://docs.obsidian.md/Plugins/Editor/Markdown+post+processing>

- [block at line 5](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Markdown%20post%20processing.md?plain=1#L5): command `Docs: Markdown post processing`, module `plugins/editor/markdown-post-processing/01-intro.ts`.
- [block at line 37](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Markdown%20post%20processing.md?plain=1#L37) under "Post-process Markdown code blocks": not runnable, Markdown, not plugin code.
- [block at line 46](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Markdown%20post%20processing.md?plain=1#L46) under "Post-process Markdown code blocks": not runnable, a Mermaid diagram, not plugin code.
- [block at line 53](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/Markdown%20post%20processing.md?plain=1#L53) under "Post-process Markdown code blocks": does not compile, `TS2532: Object is possibly 'undefined'.`, at line 12 of the block (line 65 of the page).

## Plugins > Editor > State fields

Docs page: <https://docs.obsidian.md/Plugins/Editor/State+fields>

- [block at line 20](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/State%20fields.md?plain=1#L20) under "Defining state effects": command `Docs: State fields > Defining state effects`, module `plugins/editor/state-fields/01-defining-state-effects.ts`.
- [block at line 34](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/State%20fields.md?plain=1#L34) under "Defining a state field": command `Docs: State fields > Defining a state field`, module `plugins/editor/state-fields/02-defining-a-state-field.ts`.
- [block at line 65](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/State%20fields.md?plain=1#L65) under "Dispatching state effects": does not compile, `TS2304: Cannot find name 'num'.`, at line 2 of the block (line 67 of the page).
- [block at line 73](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/State%20fields.md?plain=1#L73) under "Dispatching state effects": command `Docs: State fields > Dispatching state effects (2)`, module `plugins/editor/state-fields/04-dispatching-state-effects.ts`.

## Plugins > Editor > State management

Docs page: <https://docs.obsidian.md/Plugins/Editor/State+management>

- [block at line 10](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/State%20management.md?plain=1#L10) under "State changes": command `Docs: State management > State changes`, module `plugins/editor/state-management/01-state-changes.ts`.
- [block at line 28](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/State%20management.md?plain=1#L28) under "State changes": command `Docs: State management > State changes (2)`, module `plugins/editor/state-management/02-state-changes.ts`.
- [block at line 51](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/State%20management.md?plain=1#L51) under "Transactions": does not compile, `TS2552: Cannot find name 'selectionStart'. Did you mean 'onselectstart'?`, at line 3 of the block (line 54 of the page).

## Plugins > Editor > View plugins

Docs page: <https://docs.obsidian.md/Plugins/Editor/View+plugins>

- [block at line 19](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Editor/View%20plugins.md?plain=1#L19) under "Creating a view plugin": command `Docs: View plugins > Creating a view plugin`, module `plugins/editor/view-plugins/01-creating-a-view-plugin.ts`.

## Plugins > Events

Docs page: <https://docs.obsidian.md/Plugins/Events>

- [block at line 5](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Events.md?plain=1#L5): command `Docs: Events`, module `plugins/events/01-intro.ts`.
- [block at line 23](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Events.md?plain=1#L23) under "Timing events": does not compile, `TS2564: Property 'statusBar' has no initializer and is not definitely assigned in the constructor.`, at line 4 of the block (line 27 of the page).

## Plugins > Getting started > Anatomy of a plugin

Docs page: <https://docs.obsidian.md/Plugins/Getting+started/Anatomy+of+a+plugin>

- [block at line 3](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Anatomy%20of%20a%20plugin.md?plain=1#L3): command `Docs: Anatomy of a plugin`, module `plugins/getting-started/anatomy-of-a-plugin/01-intro.ts`.
- [block at line 29](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Anatomy%20of%20a%20plugin.md?plain=1#L29) under "Plugin lifecycle": command `Docs: Anatomy of a plugin > Plugin lifecycle`, module `plugins/getting-started/anatomy-of-a-plugin/02-plugin-lifecycle.ts`.

## Plugins > Getting started > Build a plugin

Docs page: <https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin>

- [block at line 35](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Build%20a%20plugin.md?plain=1#L35) under "Step 1: Download the sample plugin": not runnable, shell commands, not plugin code.
- [block at line 43](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Build%20a%20plugin.md?plain=1#L43) under "Step 1: Download the sample plugin": not runnable, shell commands, not plugin code.
- [block at line 58](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Build%20a%20plugin.md?plain=1#L58) under "Step 2: Build the plugin": not runnable, shell commands, not plugin code.
- [block at line 64](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Build%20a%20plugin.md?plain=1#L64) under "Step 2: Build the plugin": not runnable, shell commands, not plugin code.
- [block at line 70](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Build%20a%20plugin.md?plain=1#L70) under "Step 2: Build the plugin": not runnable, shell commands, not plugin code.
- [block at line 109](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Build%20a%20plugin.md?plain=1#L109) under "Step 5: Update the source code": command `Docs: Build a plugin > Step 5: Update the source code`, module `plugins/getting-started/build-a-plugin/06-step-5-update-the-source-code.ts`.
- [block at line 115](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Build%20a%20plugin.md?plain=1#L115) under "Step 5: Update the source code": command `Docs: Build a plugin > Step 5: Update the source code (2)`, module `plugins/getting-started/build-a-plugin/07-step-5-update-the-source-code.ts`.

## Plugins > Getting started > Mobile development

Docs page: <https://docs.obsidian.md/Plugins/Getting+started/Mobile+development>

- [block at line 11](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Mobile%20development.md?plain=1#L11) under "Emulate mobile device on desktop": does not compile, `TS2339: Property 'emulateMobile' does not exist on type 'App'.`, at line 1 of the block (line 12 of the page).
- [block at line 17](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Mobile%20development.md?plain=1#L17) under "Emulate mobile device on desktop": does not compile, `TS2339: Property 'emulateMobile' does not exist on type 'App'.`, at line 1 of the block (line 18 of the page).
- [block at line 44](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Mobile%20development.md?plain=1#L44) under "Platform-specific features": command `Docs: Mobile development > Platform-specific features`, module `plugins/getting-started/mobile-development/03-platform-specific-features.ts`.

## Plugins > Getting started > Use React in your plugin

Docs page: <https://docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin>

- [block at line 13](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20React%20in%20your%20plugin.md?plain=1#L13) under "Configure your plugin": not runnable, shell commands, not plugin code.
- [block at line 19](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20React%20in%20your%20plugin.md?plain=1#L19) under "Configure your plugin": not runnable, shell commands, not plugin code.
- [block at line 25](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20React%20in%20your%20plugin.md?plain=1#L25) under "Configure your plugin": command `Docs: Use React in your plugin > Configure your plugin (3)`, module `plugins/getting-started/use-react-in-your-plugin/03-configure-your-plugin.ts`.
- [block at line 37](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20React%20in%20your%20plugin.md?plain=1#L37) under "Create a React component": not runnable, JSX for React, which this preset does not install.
- [block at line 47](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20React%20in%20your%20plugin.md?plain=1#L47) under "Mount the React component": not runnable, JSX for React, which this preset does not install.
- [block at line 97](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20React%20in%20your%20plugin.md?plain=1#L97) under "Create an App context": not runnable, JSX for React, which this preset does not install.
- [block at line 106](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20React%20in%20your%20plugin.md?plain=1#L106) under "Create an App context": not runnable, JSX for React, which this preset does not install.
- [block at line 117](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20React%20in%20your%20plugin.md?plain=1#L117) under "Create an App context": not runnable, JSX for React, which this preset does not install.
- [block at line 128](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20React%20in%20your%20plugin.md?plain=1#L128) under "Create an App context": not runnable, JSX for React, which this preset does not install.

## Plugins > Getting started > Use Svelte in your plugin

Docs page: <https://docs.obsidian.md/Plugins/Getting+started/Use+Svelte+in+your+plugin>

- [block at line 19](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20Svelte%20in%20your%20plugin.md?plain=1#L19) under "Configure your plugin": not runnable, shell commands, not plugin code.
- [block at line 32](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20Svelte%20in%20your%20plugin.md?plain=1#L32) under "Configure your plugin": not runnable, a JSON sample (a manifest, `versions.json`, `data.json` or a config file), not plugin code.
- [block at line 48](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20Svelte%20in%20your%20plugin.md?plain=1#L48) under "Configure your plugin": not runnable, JavaScript for the build script (`esbuild.config.mjs`), not plugin code.
- [block at line 55](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20Svelte%20in%20your%20plugin.md?plain=1#L55) under "Configure your plugin": not runnable, JavaScript for the build script (`esbuild.config.mjs`), not plugin code.
- [block at line 69](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20Svelte%20in%20your%20plugin.md?plain=1#L69) under "Configure your plugin": not runnable, a JSON sample (a manifest, `versions.json`, `data.json` or a config file), not plugin code.
- [block at line 83](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20Svelte%20in%20your%20plugin.md?plain=1#L83) under "Create a Svelte component": not runnable, a Svelte component, which this preset does not compile.
- [block at line 115](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Getting%20started/Use%20Svelte%20in%20your%20plugin.md?plain=1#L115) under "Mount the Svelte component": does not compile, `TS2307: Cannot find module './Counter.svelte' or its corresponding type declarations.`, at line 2 of the block (line 117 of the page).

## Plugins > Guides > Build a Bases view

Docs page: <https://docs.obsidian.md/Plugins/Guides/Build+a+Bases+view>

- [block at line 37](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Build%20a%20Bases%20view.md?plain=1#L37) under "Step 1: Sample plugin setup": command `Docs: Build a Bases view > Step 1: Sample plugin setup`, module `plugins/guides/build-a-bases-view/01-step-1-sample-plugin-setup.ts`.
- [block at line 48](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Build%20a%20Bases%20view.md?plain=1#L48) under "Step 2: Create and register the Bases view": command `Docs: Build a Bases view > Step 2: Create and register the Bases view`, module `plugins/guides/build-a-bases-view/02-step-2-create-and-register-the-bases-vie.ts`.
- [block at line 91](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Build%20a%20Bases%20view.md?plain=1#L91) under "Step 3: Add configuration": command `Docs: Build a Bases view > Step 3: Add configuration`, module `plugins/guides/build-a-bases-view/03-step-3-add-configuration.ts`.
- [block at line 125](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Build%20a%20Bases%20view.md?plain=1#L125) under "Step 4: Display list items": does not compile, `TS2515: Non-abstract class 'MyBasesView' does not implement inherited abstract member type from class 'BasesView'.`, at line 2 of the block (line 127 of the page).

## Plugins > Guides > Defer views

Docs page: <https://docs.obsidian.md/Plugins/Guides/Defer+views>

- [block at line 14](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Defer%20views.md?plain=1#L14) under "Accessing `leaf.view`": not runnable, does not parse as TypeScript: Declaration or statement expected. (line 5 of the block).
- [block at line 31](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Defer%20views.md?plain=1#L31) under "Accessing `leaf.view`": not runnable, does not parse as TypeScript: Declaration or statement expected. (line 6 of the block).
- [block at line 56](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Defer%20views.md?plain=1#L56) under "Accessing your `CustomView` anywhere in the workspace": does not compile, `TS2304: Cannot find name 'MyCustomView'.`, at line 4 of the block (line 60 of the page).
- [block at line 74](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Defer%20views.md?plain=1#L74) under "Accessing your `CustomView` without reveal (Advanced)": command `Docs: Defer views > Accessing your CustomView without reveal (Advanced)`, module `plugins/guides/defer-views/04-accessing-your-customview-without-reveal.ts`.

## Plugins > Guides > Manage plugin lifecycle

Docs page: <https://docs.obsidian.md/Plugins/Guides/Manage+plugin+lifecycle>

- [block at line 23](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L23) under "Overview": command `Docs: Manage plugin lifecycle > Overview`, module `plugins/guides/manage-plugin-lifecycle/01-overview.ts`.
- [block at line 40](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L40) under "Overview": command `Docs: Manage plugin lifecycle > Overview (2)`, module `plugins/guides/manage-plugin-lifecycle/02-overview.ts`.
- [block at line 65](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L65) under "Automatic Resource Management with `Component`": command `Docs: Manage plugin lifecycle > Automatic Resource Management with Component`, module `plugins/guides/manage-plugin-lifecycle/03-automatic-resource-management-with-compo.ts`.
- [block at line 86](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L86) under "Automatic Resource Management with `Component` > `registerEvent(eventRef)`": command `Docs: Manage plugin lifecycle > Automatic Resource Management with Component > registerEvent(eventRef)`, module `plugins/guides/manage-plugin-lifecycle/04-registerevent-eventref.ts`.
- [block at line 98](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L98) under "Automatic Resource Management with `Component` > `registerInterval(id)`": command `Docs: Manage plugin lifecycle > Automatic Resource Management with Component > registerInterval(id)`, module `plugins/guides/manage-plugin-lifecycle/05-registerinterval-id.ts`.
- [block at line 109](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L109) under "Automatic Resource Management with `Component` > `registerDomEvent(el, event, handler)`": command `Docs: Manage plugin lifecycle > Automatic Resource Management with Component > registerDomEvent(el, event, handler)`, module `plugins/guides/manage-plugin-lifecycle/06-registerdomevent-el-event-handler.ts`.
- [block at line 128](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L128) under "Understanding The Lifecycle of Objects": does not compile, `TS2654: Non-abstract class 'MyView' is missing implementations for the following members of 'ItemView': 'getViewType', 'getDisplayText'.`, at line 1 of the block (line 129 of the page).
- [block at line 160](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L160) under "Understanding The Lifecycle of Objects": command `Docs: Manage plugin lifecycle > Understanding The Lifecycle of Objects (2)`, module `plugins/guides/manage-plugin-lifecycle/08-understanding-the-lifecycle-of-objects.ts`.
- [block at line 225](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L225) under "Passing Components to Other APIs": does not compile, `TS2304: Cannot find name 'COMPONENT'.`, at line 1 of the block (line 226 of the page).
- [block at line 235](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L235) under "Passing Components to Other APIs > Common Pitfall: Orphaned Components": does not compile, `TS2654: Non-abstract class 'MyView' is missing implementations for the following members of 'ItemView': 'getViewType', 'getDisplayText'.`, at line 3 of the block (line 238 of the page).
- [block at line 254](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L254) under "Passing Components to Other APIs > Solution: Add or use an existing component": does not compile, `TS2654: Non-abstract class 'MyView' is missing implementations for the following members of 'ItemView': 'getViewType', 'getDisplayText'.`, at line 3 of the block (line 257 of the page).
- [block at line 273](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L273) under "Creating Your Own Components": does not compile, `TS2307: Cannot find module 'some-library' or its corresponding type declarations.`, at line 2 of the block (line 275 of the page).
- [block at line 317](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L317) under "Creating Your Own Components": does not compile, it imports from the block at line 273 of Plugins/Guides/Manage plugin lifecycle, which does not compile.
- [block at line 349](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Manage%20plugin%20lifecycle.md?plain=1#L349) under "Creating Your Own Components > Componentized Modal Example": command `Docs: Manage plugin lifecycle > Creating Your Own Components > Componentized Modal Example`, module `plugins/guides/manage-plugin-lifecycle/14-componentized-modal-example.ts`.

## Plugins > Guides > Migrate to declarative settings

Docs page: <https://docs.obsidian.md/Plugins/Guides/Migrate+to+declarative+settings>

- [block at line 33](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Migrate%20to%20declarative%20settings.md?plain=1#L33) under "The starting point": does not compile, `TS2571: Object is of type 'unknown'.`, at line 26 of the block (line 59 of the page).
- [block at line 118](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Migrate%20to%20declarative%20settings.md?plain=1#L118) under "Migrate the tab > Path A: clean 1.13-only migration > After": does not compile, `TS2416: Property 'getSettingDefinitions' in type 'MySettingTab' is not assignable to the same property in base type 'PluginSettingTab'.`, at line 18 of the block (line 136 of the page).
- [block at line 181](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Migrate%20to%20declarative%20settings.md?plain=1#L181) under "Migrate the tab > Path B: dual support": does not compile, `TS2416: Property 'getSettingDefinitions' in type 'MySettingTab' is not assignable to the same property in base type 'PluginSettingTab'.`, at line 20 of the block (line 201 of the page).

## Plugins > Guides > Optimize plugin load time

Docs page: <https://docs.obsidian.md/Plugins/Guides/Optimize+plugin+load+time>

- [block at line 36](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Optimize%20plugin%20load%20time.md?plain=1#L36) under "Pitfalls > Listening to `vault.on('create')` > Option A. Check if the layout is ready": command `Docs: Optimize plugin load time > Pitfalls > Listening to vault.on('create') > Option A. Check if the layout is ready`, module `plugins/guides/optimize-plugin-load-time/01-option-a-check-if-the-layout-is-ready.ts`.
- [block at line 54](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Optimize%20plugin%20load%20time.md?plain=1#L54) under "Pitfalls > Listening to `vault.on('create')` > Option B. Register the handler once the layout is ready": command `Docs: Optimize plugin load time > Pitfalls > Listening to vault.on('create') > Option B. Register the handler once the layout is ready`, module `plugins/guides/optimize-plugin-load-time/02-option-b-register-the-handler-once-the-l.ts`.

## Plugins > Guides > Store secrets

Docs page: <https://docs.obsidian.md/Plugins/Guides/Store+secrets>

- [block at line 38](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Store%20secrets.md?plain=1#L38) under "Step 1: Update your settings interface": does not compile, `TS2307: Cannot find module './main' or its corresponding type declarations.`, at line 2 of the block (line 40 of the page).
- [block at line 51](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Store%20secrets.md?plain=1#L51) under "Step 2: Add the SecretComponent to your settings tab": does not compile, `TS2307: Cannot find module './main' or its corresponding type declarations.`, at line 2 of the block (line 53 of the page).
- [block at line 89](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Store%20secrets.md?plain=1#L89) under "Step 3: Retrieve the secret value": command `Docs: Store secrets > Step 3: Retrieve the secret value`, module `plugins/guides/store-secrets/03-step-3-retrieve-the-secret-value.ts`.
- [block at line 102](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Store%20secrets.md?plain=1#L102) under "Complete example": does not compile, `TS2307: Cannot find module './main' or its corresponding type declarations.`, at line 2 of the block (line 104 of the page).

## Plugins > Guides > Support pop-out windows

Docs page: <https://docs.obsidian.md/Plugins/Guides/Support+pop-out+windows>

- [block at line 14](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Support%20pop-out%20windows.md?plain=1#L14): not runnable, does not parse as TypeScript: Expression expected. (line 1 of the block).
- [block at line 42](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Guides/Support%20pop-out%20windows.md?plain=1#L42): not runnable, does not parse as TypeScript: Expression expected. (line 1 of the block).

## Plugins > Releasing > Plugin guidelines

Docs page: <https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines>

- [block at line 73](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L73) under "UI text > Use `setHeading` instead of a `<h1>`, `<h2>`": command `Docs: Plugin guidelines > UI text > Use setHeading instead of a <h1>, <h2>`, module `plugins/releasing/plugin-guidelines/01-use-setheading-instead-of-a-h1-h2.ts`.
- [block at line 84](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L84) under "Security > Avoid `innerHTML`, `outerHTML` and `insertAdjacentHTML`": does not compile, `TS18047: 'containerElement' is possibly 'null'.`, at line 4 of the block (line 88 of the page).
- [block at line 104](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L104) under "Resource management > Clean up resources when plugin unloads": command `Docs: Plugin guidelines > Resource management > Clean up resources when plugin unloads`, module `plugins/releasing/plugin-guidelines/03-clean-up-resources-when-plugin-unloads.ts`.
- [block at line 146](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L146) under "Workspace > Avoid accessing `workspace.activeLeaf` directly": command `Docs: Plugin guidelines > Workspace > Avoid accessing workspace.activeLeaf directly`, module `plugins/releasing/plugin-guidelines/04-avoid-accessing-workspace-activeleaf-dir.ts`.
- [block at line 157](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L157) under "Workspace > Avoid accessing `workspace.activeLeaf` directly": command `Docs: Plugin guidelines > Workspace > Avoid accessing workspace.activeLeaf directly (2)`, module `plugins/releasing/plugin-guidelines/05-avoid-accessing-workspace-activeleaf-dir.ts`.
- [block at line 171](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L171) under "Workspace > Avoid managing references to custom views": does not compile, `TS2304: Cannot find name 'MY_VIEW_TYPE'.`, at line 1 of the block (line 172 of the page).
- [block at line 177](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L177) under "Workspace > Avoid managing references to custom views": does not compile, `TS2304: Cannot find name 'MY_VIEW_TYPE'.`, at line 1 of the block (line 178 of the page).
- [block at line 183](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L183) under "Workspace > Avoid managing references to custom views": does not compile, `TS2304: Cannot find name 'MY_VIEW_TYPE'.`, at line 1 of the block (line 184 of the page).
- [block at line 230](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L230) under "Vault > Avoid iterating all files to find a file by its path": does not compile, `TS2304: Cannot find name 'filePath'.`, at line 1 of the block (line 231 of the page).
- [block at line 236](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L236) under "Vault > Avoid iterating all files to find a file by its path": command `Docs: Plugin guidelines > Vault > Avoid iterating all files to find a file by its path (2)`, module `plugins/releasing/plugin-guidelines/10-avoid-iterating-all-files-to-find-a-file.ts`.
- [block at line 242](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L242) under "Vault > Avoid iterating all files to find a file by its path": command `Docs: Plugin guidelines > Vault > Avoid iterating all files to find a file by its path (3)`, module `plugins/releasing/plugin-guidelines/11-avoid-iterating-all-files-to-find-a-file.ts`.
- [block at line 249](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L249) under "Vault > Avoid iterating all files to find a file by its path": does not compile, `TS2304: Cannot find name 'filePath'.`, at line 1 of the block (line 250 of the page).
- [block at line 271](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L271) under "Vault > Use `normalizePath()` to clean up user-defined paths": command `Docs: Plugin guidelines > Vault > Use normalizePath() to clean up user-defined paths`, module `plugins/releasing/plugin-guidelines/13-use-normalizepath-to-clean-up-user-defin.ts`.
- [block at line 283](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L283) under "Editor > Change or reconfigure editor extensions": does not compile, `TS2551: Property 'createEditorExtension' does not exist on type 'MyPlugin'. Did you mean 'editorExtension'?`, at line 16 of the block (line 299 of the page).
- [block at line 315](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L315) under "Styling > No hardcoded styling": command `Docs: Plugin guidelines > Styling > No hardcoded styling`, module `plugins/releasing/plugin-guidelines/15-no-hardcoded-styling.ts`.
- [block at line 325](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L325) under "Styling > No hardcoded styling": command `Docs: Plugin guidelines > Styling > No hardcoded styling (2)`, module `plugins/releasing/plugin-guidelines/16-no-hardcoded-styling.ts`.
- [block at line 331](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L331) under "Styling > No hardcoded styling": command `Docs: Plugin guidelines > Styling > No hardcoded styling (3)`, module `plugins/releasing/plugin-guidelines/17-no-hardcoded-styling.ts`.
- [block at line 353](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L353) under "TypeScript > Prefer async/await over Promise": command `Docs: Plugin guidelines > TypeScript > Prefer async/await over Promise`, module `plugins/releasing/plugin-guidelines/18-prefer-async-await-over-promise.ts`.
- [block at line 366](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Plugin%20guidelines.md?plain=1#L366) under "TypeScript > Prefer async/await over Promise": command `Docs: Plugin guidelines > TypeScript > Prefer async/await over Promise (2)`, module `plugins/releasing/plugin-guidelines/19-prefer-async-await-over-promise.ts`.

## Plugins > Releasing > Release your plugin with GitHub Actions

Docs page: <https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin+with+GitHub+Actions>

- [block at line 5](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Release%20your%20plugin%20with%20GitHub%20Actions.md?plain=1#L5): not runnable, a YAML file (a GitHub Actions workflow), not plugin code.
- [block at line 57](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Release%20your%20plugin%20with%20GitHub%20Actions.md?plain=1#L57): not runnable, shell commands, not plugin code.
- [block at line 67](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Releasing/Release%20your%20plugin%20with%20GitHub%20Actions.md?plain=1#L67): not runnable, shell commands, not plugin code.

## Plugins > User interface > Commands

Docs page: <https://docs.obsidian.md/Plugins/User+interface/Commands>

- [block at line 7](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Commands.md?plain=1#L7): command `Docs: Commands`, module `plugins/user-interface/commands/01-intro.ts`.
- [block at line 38](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Commands.md?plain=1#L38) under "Conditional commands": does not compile, `TS2304: Cannot find name 'getRequiredValue'.`, at line 6 of the block (line 44 of the page).
- [block at line 63](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Commands.md?plain=1#L63) under "Editor commands": command `Docs: Commands > Editor commands`, module `plugins/user-interface/commands/03-editor-commands.ts`.
- [block at line 80](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Commands.md?plain=1#L80) under "Editor commands": does not compile, `TS2304: Cannot find name 'getRequiredValue'.`, at line 5 of the block (line 85 of the page).
- [block at line 109](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Commands.md?plain=1#L109) under "Hot keys": command `Docs: Commands > Hot keys`, module `plugins/user-interface/commands/05-hot-keys.ts`.

## Plugins > User interface > Context menus

Docs page: <https://docs.obsidian.md/Plugins/User+interface/Context+menus>

- [block at line 3](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Context%20menus.md?plain=1#L3): command `Docs: Context menus`, module `plugins/user-interface/context-menus/01-intro.ts`.
- [block at line 46](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Context%20menus.md?plain=1#L46): does not compile, `TS18047: 'view.file' is possibly 'null'.`, at line 25 of the block (line 71 of the page).

## Plugins > User interface > HTML elements

Docs page: <https://docs.obsidian.md/Plugins/User+interface/HTML+elements>

- [block at line 3](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/HTML%20elements.md?plain=1#L3): does not compile, `TS2304: Cannot find name 'ExamplePlugin'.`, at line 4 of the block (line 7 of the page).
- [block at line 31](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/HTML%20elements.md?plain=1#L31) under "Create HTML elements using `createEl()`": command `Docs: HTML elements > Create HTML elements using createEl()`, module `plugins/user-interface/html-elements/02-create-html-elements-using-createel.ts`.
- [block at line 37](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/HTML%20elements.md?plain=1#L37) under "Create HTML elements using `createEl()`": command `Docs: HTML elements > Create HTML elements using createEl() (2)`, module `plugins/user-interface/html-elements/03-create-html-elements-using-createel.ts`.
- [block at line 47](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/HTML%20elements.md?plain=1#L47) under "Style your elements": command `Docs: HTML elements > Style your elements`, module `plugins/user-interface/html-elements/04-style-your-elements.ts`.
- [block at line 67](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/HTML%20elements.md?plain=1#L67) under "Style your elements": command `Docs: HTML elements > Style your elements (2)`, module `plugins/user-interface/html-elements/05-style-your-elements.ts`.
- [block at line 81](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/HTML%20elements.md?plain=1#L81) under "Style your elements > Conditional styles": command `Docs: HTML elements > Style your elements > Conditional styles`, module `plugins/user-interface/html-elements/06-conditional-styles.ts`.

## Plugins > User interface > Icons

Docs page: <https://docs.obsidian.md/Plugins/User+interface/Icons>

- [block at line 13](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Icons.md?plain=1#L13) under "Use icons": command `Docs: Icons > Use icons`, module `plugins/user-interface/icons/01-use-icons.ts`.
- [block at line 26](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Icons.md?plain=1#L26) under "Use icons": command `Docs: Icons > Use icons (2)`, module `plugins/user-interface/icons/02-use-icons.ts`.
- [block at line 36](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Icons.md?plain=1#L36) under "Add your own icon": command `Docs: Icons > Add your own icon`, module `plugins/user-interface/icons/03-add-your-own-icon.ts`.

## Plugins > User interface > Modals

Docs page: <https://docs.obsidian.md/Plugins/User+interface/Modals>

- [block at line 3](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Modals.md?plain=1#L3): command `Docs: Modals`, module `plugins/user-interface/modals/01-intro.ts`.
- [block at line 16](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Modals.md?plain=1#L16): command `Docs: Modals (2)`, module `plugins/user-interface/modals/02-intro.ts`.
- [block at line 39](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Modals.md?plain=1#L39) under "Accept user input": command `Docs: Modals > Accept user input`, module `plugins/user-interface/modals/03-accept-user-input.ts`.
- [block at line 70](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Modals.md?plain=1#L70) under "Accept user input": command `Docs: Modals > Accept user input (2)`, module `plugins/user-interface/modals/04-accept-user-input.ts`.
- [block at line 82](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Modals.md?plain=1#L82) under "Select from list of suggestions": command `Docs: Modals > Select from list of suggestions`, module `plugins/user-interface/modals/05-select-from-list-of-suggestions.ts`.
- [block at line 132](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Modals.md?plain=1#L132) under "Select from list of suggestions > Approximate string matching results": command `Docs: Modals > Select from list of suggestions > Approximate string matching results`, module `plugins/user-interface/modals/06-approximate-string-matching-results.ts`.
- [block at line 158](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Modals.md?plain=1#L158) under "Select from list of suggestions > Custom rendering of fuzzy search results": command `Docs: Modals > Select from list of suggestions > Custom rendering of fuzzy search results`, module `plugins/user-interface/modals/07-custom-rendering-of-fuzzy-search-results.ts`.

## Plugins > User interface > Ribbon actions

Docs page: <https://docs.obsidian.md/Plugins/User+interface/Ribbon+actions>

- [block at line 5](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Ribbon%20actions.md?plain=1#L5): command `Docs: Ribbon actions`, module `plugins/user-interface/ribbon-actions/01-intro.ts`.

## Plugins > User interface > Right-to-left

Docs page: <https://docs.obsidian.md/Plugins/User+interface/Right-to-left>

- [block at line 69](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Right-to-left.md?plain=1#L69) under "Make plugins and themes agnostic of language direction > Use fallback values when necessary": command `Docs: Right-to-left > Make plugins and themes agnostic of language direction > Use fallback values when necessary`, module `plugins/user-interface/right-to-left/01-use-fallback-values-when-necessary.ts`.
- [block at line 98](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Right-to-left.md?plain=1#L98) under "Obsidian CSS helpers and rules for RTL > Selectors for language direction > Global selectors": command `Docs: Right-to-left > Obsidian CSS helpers and rules for RTL > Selectors for language direction > Global selectors`, module `plugins/user-interface/right-to-left/02-global-selectors.ts`.
- [block at line 120](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Right-to-left.md?plain=1#L120) under "Obsidian CSS helpers and rules for RTL > Icons are mirrored automatically": command `Docs: Right-to-left > Obsidian CSS helpers and rules for RTL > Icons are mirrored automatically`, module `plugins/user-interface/right-to-left/03-icons-are-mirrored-automatically.ts`.

## Plugins > User interface > Settings

Docs page: <https://docs.obsidian.md/Plugins/User+interface/Settings>

- [block at line 12](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L12): does not compile, `TS2564: Property 'settings' has no initializer and is not definitely assigned in the constructor.`, at line 13 of the block (line 25 of the page).
- [block at line 49](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L49) under "Create a settings definition": does not compile, `TS2564: Property 'settings' has no initializer and is not definitely assigned in the constructor.`, at line 6 of the block (line 55 of the page).
- [block at line 65](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L65) under "Save and load the settings object": does not compile, it imports from the block at line 12 of Plugins/User interface/Settings, which does not compile.
- [block at line 82](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L82) under "Save and load the settings object": does not compile, `TS2551: Property 'loadSettings' does not exist on type 'DocsSnippetPlugin'. Did you mean 'settings'?`, at line 2 of the block (line 84 of the page).
- [block at line 96](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L96) under "Provide default values": does not compile, it imports from the block at line 12 of Plugins/User interface/Settings, which does not compile.
- [block at line 102](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L102) under "Provide default values": does not compile, it imports from the block at line 49 of Plugins/User interface/Settings, which does not compile.
- [block at line 115](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L115) under "Register a settings tab": does not compile, `TS2345: Argument of type 'ExampleSettingTab' is not assignable to parameter of type 'PluginSettingTab'.`, at line 1 of the block (line 116 of the page).
- [block at line 121](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L121) under "Register a settings tab": does not compile, `TS2307: Cannot find module './main' or its corresponding type declarations.`, at line 1 of the block (line 122 of the page).
- [block at line 190](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L190) under "Control types > Toggle": command `Docs: Settings > Control types > Toggle`, module `plugins/user-interface/settings/09-toggle.ts`.
- [block at line 196](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L196) under "Control types > Text": command `Docs: Settings > Control types > Text`, module `plugins/user-interface/settings/10-text.ts`.
- [block at line 205](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L205) under "Control types > Textarea": command `Docs: Settings > Control types > Textarea`, module `plugins/user-interface/settings/11-textarea.ts`.
- [block at line 214](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L214) under "Control types > Number": command `Docs: Settings > Control types > Number`, module `plugins/user-interface/settings/12-number.ts`.
- [block at line 223](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L223) under "Control types > Slider": command `Docs: Settings > Control types > Slider`, module `plugins/user-interface/settings/13-slider.ts`.
- [block at line 232](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L232) under "Control types > Dropdown": command `Docs: Settings > Control types > Dropdown`, module `plugins/user-interface/settings/14-dropdown.ts`.
- [block at line 246](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L246) under "Control types > File": command `Docs: Settings > Control types > File`, module `plugins/user-interface/settings/15-file.ts`.
- [block at line 259](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L259) under "Control types > Folder": command `Docs: Settings > Control types > Folder`, module `plugins/user-interface/settings/16-folder.ts`.
- [block at line 268](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L268) under "Control types > Color picker": command `Docs: Settings > Control types > Color picker`, module `plugins/user-interface/settings/17-color-picker.ts`.
- [block at line 288](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L288) under "Validating input": command `Docs: Settings > Validating input`, module `plugins/user-interface/settings/18-validating-input.ts`.
- [block at line 318](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L318) under "Conditional visibility and enabling": does not compile, `TS2416: Property 'getSettingDefinitions' in type 'DocsSnippetSettingTab' is not assignable to the same property in base type 'PluginSettingTab'.`, at line 1 of the block (line 319 of the page).
- [block at line 360](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L360) under "Custom settings storage": does not compile, `TS2304: Cannot find name 'MyPlugin'.`, at line 2 of the block (line 362 of the page).
- [block at line 388](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L388) under "Custom settings storage > Advanced: nested settings with dot-notation keys": does not compile, `TS2304: Cannot find name 'MyPlugin'.`, at line 31 of the block (line 419 of the page).
- [block at line 472](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L472) under "Reacting to changes outside the settings tab": does not compile, `TS2304: Cannot find name 'MyPlugin'.`, at line 4 of the block (line 476 of the page).
- [block at line 499](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L499) under "Groups": command `Docs: Settings > Groups`, module `plugins/user-interface/settings/23-groups.ts`.
- [block at line 518](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L518) under "Lists": does not compile, `TS2339: Property 'openAddFolderModal' does not exist on type 'DocsThis'.`, at line 7 of the block (line 525 of the page).
- [block at line 558](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L558) under "Lists": not runnable, a fragment of an object literal: members shown out of the object they belong to.
- [block at line 572](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L572) under "Lists": does not compile, `TS7006: Parameter 'item' implicitly has an 'any' type.`, at line 4 of the block (line 576 of the page).
- [block at line 590](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L590) under "Lists > Lists with a form modal": does not compile, `TS2304: Cannot find name 'AddEntryModal'.`, at line 4 of the block (line 594 of the page).
- [block at line 633](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L633) under "Sub-pages > Declarative pages": does not compile, `TS2339: Property 'clearCache' does not exist on type 'DocsPlugin'.`, at line 13 of the block (line 646 of the page).
- [block at line 662](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L662) under "Sub-pages > Imperative pages": not runnable, does not parse as TypeScript: ';' expected. (line 30 of the block).
- [block at line 701](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L701) under "Sub-pages > Imperative pages": does not compile, `TS2564: Property 'timer' has no initializer and is not definitely assigned in the constructor.`, at line 2 of the block (line 703 of the page).
- [block at line 725](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L725) under "Render callback": does not compile, `TS2339: Property 'applyFeatureX' does not exist on type 'DocsPlugin'.`, at line 8 of the block (line 733 of the page).
- [block at line 749](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L749) under "Render callback > Cleanup": command `Docs: Settings > Render callback > Cleanup`, module `plugins/user-interface/settings/32-cleanup.ts`.
- [block at line 781](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L781) under "Style guide > No top-level heading": command `Docs: Settings > Style guide > No top-level heading`, module `plugins/user-interface/settings/33-no-top-level-heading.ts`.
- [block at line 800](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L800) under "Style guide > Headings only when there are multiple sections": command `Docs: Settings > Style guide > Headings only when there are multiple sections`, module `plugins/user-interface/settings/34-headings-only-when-there-are-multiple-se.ts`.
- [block at line 855](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L855) under "Legacy: imperative display() approach": does not compile, `TS2307: Cannot find module './main' or its corresponding type declarations.`, at line 1 of the block (line 856 of the page).
- [block at line 897](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L897) under "Legacy: imperative display() approach > Available components > Headings": command `Docs: Settings > Legacy: imperative display() approach > Available components > Headings`, module `plugins/user-interface/settings/36-headings.ts`.
- [block at line 907](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L907) under "Legacy: imperative display() approach > Available components > Search with suggestions": does not compile, `TS2304: Cannot find name 'IconSuggest'.`, at line 10 of the block (line 917 of the page).
- [block at line 925](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L925) under "Legacy: imperative display() approach > Available components > Moment format": command `Docs: Settings > Legacy: imperative display() approach > Available components > Moment format`, module `plugins/user-interface/settings/38-moment-format.ts`.
- [block at line 953](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L953) under "Legacy: imperative display() approach > Available components > Buttons": command `Docs: Settings > Legacy: imperative display() approach > Available components > Buttons`, module `plugins/user-interface/settings/39-buttons.ts`.
- [block at line 969](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L969) under "Legacy: imperative display() approach > Available components > Extra button": command `Docs: Settings > Legacy: imperative display() approach > Available components > Extra button`, module `plugins/user-interface/settings/40-extra-button.ts`.
- [block at line 985](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Settings.md?plain=1#L985) under "Legacy: imperative display() approach > Available components > Progress bar": command `Docs: Settings > Legacy: imperative display() approach > Available components > Progress bar`, module `plugins/user-interface/settings/41-progress-bar.ts`.

## Plugins > User interface > Status bar

Docs page: <https://docs.obsidian.md/Plugins/User+interface/Status+bar>

- [block at line 6](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Status%20bar.md?plain=1#L6): command `Docs: Status bar`, module `plugins/user-interface/status-bar/01-intro.ts`.
- [block at line 22](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Status%20bar.md?plain=1#L22): command `Docs: Status bar (2)`, module `plugins/user-interface/status-bar/02-intro.ts`.

## Plugins > User interface > Views

Docs page: <https://docs.obsidian.md/Plugins/User+interface/Views>

- [block at line 5](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Views.md?plain=1#L5): command `Docs: Views`, module `plugins/user-interface/views/01-intro.ts`.
- [block at line 47](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Views.md?plain=1#L47): does not compile, `TS2322: Type 'WorkspaceLeaf | undefined' is not assignable to type 'WorkspaceLeaf | null'.`, at line 27 of the block (line 74 of the page).

## Plugins > User interface > Workspace

Docs page: <https://docs.obsidian.md/Plugins/User+interface/Workspace>

- [block at line 7](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Workspace.md?plain=1#L7): not runnable, a Mermaid diagram, not plugin code.
- [block at line 25](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Workspace.md?plain=1#L25): not runnable, a Mermaid diagram, not plugin code.
- [block at line 54](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Workspace.md?plain=1#L54) under "Splits": not runnable, a Mermaid diagram, not plugin code.
- [block at line 71](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Workspace.md?plain=1#L71) under "Splits": not runnable, a Mermaid diagram, not plugin code.
- [block at line 101](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Workspace.md?plain=1#L101) under "Inspect the workspace": command `Docs: Workspace > Inspect the workspace`, module `plugins/user-interface/workspace/05-inspect-the-workspace.ts`.
- [block at line 132](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/User%20interface/Workspace.md?plain=1#L132) under "Leaf groups": command `Docs: Workspace > Leaf groups`, module `plugins/user-interface/workspace/06-leaf-groups.ts`.

## Plugins > Vault

Docs page: <https://docs.obsidian.md/Plugins/Vault>

- [block at line 12](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Vault.md?plain=1#L12): does not compile, `TS2532: Object is possibly 'undefined'.`, at line 4 of the block (line 16 of the page).
- [block at line 35](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Vault.md?plain=1#L35) under "Read files": command `Docs: Vault > Read files`, module `plugins/vault/02-read-files.ts`.
- [block at line 67](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Vault.md?plain=1#L67) under "Modify files": command `Docs: Vault > Modify files`, module `plugins/vault/03-modify-files.ts`.
- [block at line 75](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Vault.md?plain=1#L75) under "Modify files": command `Docs: Vault > Modify files (2)`, module `plugins/vault/04-modify-files.ts`.
- [block at line 109](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Plugins/Vault.md?plain=1#L109) under "Is it a file or folder?": command `Docs: Vault > Is it a file or folder?`, module `plugins/vault/05-is-it-a-file-or-folder.ts`.

## Reference > CSS variables > About styling

Docs page: <https://docs.obsidian.md/Reference/CSS+variables/About+styling>

- [block at line 11](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/CSS%20variables/About%20styling.md?plain=1#L11) under "For plugins": command `Docs: About styling > For plugins`, module `reference/css-variables/about-styling/01-for-plugins.ts`.
- [block at line 23](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/CSS%20variables/About%20styling.md?plain=1#L23) under "For themes and snippets": command `Docs: About styling > For themes and snippets`, module `reference/css-variables/about-styling/02-for-themes-and-snippets.ts`.

## Reference > CSS variables > Foundations > Colors

Docs page: <https://docs.obsidian.md/Reference/CSS+variables/Foundations/Colors>

- [block at line 55](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/CSS%20variables/Foundations/Colors.md?plain=1#L55) under "Extended colors": not runnable, a CSS fragment with no selector, so there is no rule to apply.

## Reference > CSS variables > Publish > Site fonts

Docs page: <https://docs.obsidian.md/Reference/CSS+variables/Publish/Site+fonts>

- [block at line 8](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/CSS%20variables/Publish/Site%20fonts.md?plain=1#L8): command `Docs: Site fonts`, module `reference/css-variables/publish/site-fonts/01-intro.ts`.

## Reference > Manifest

Docs page: <https://docs.obsidian.md/Reference/Manifest>

- [block at line 53](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/Manifest.md?plain=1#L53) under "fundingUrl": not runnable, a JSON sample (a manifest, `versions.json`, `data.json` or a config file), not plugin code.
- [block at line 61](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/Manifest.md?plain=1#L61) under "fundingUrl": not runnable, a JSON sample (a manifest, `versions.json`, `data.json` or a config file), not plugin code.

## Reference > TypeScript API > Command > callback

Docs page: <https://docs.obsidian.md/Reference/TypeScript+API/Command/callback>

- [block at line 23](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/TypeScript%20API/Command/callback.md?plain=1#L23) under "Example": command `Docs: callback > Example`, module `reference/typescript-api/command/callback/01-example.ts`.

## Reference > TypeScript API > Command > checkCallback

Docs page: <https://docs.obsidian.md/Reference/TypeScript+API/Command/checkCallback>

- [block at line 23](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/TypeScript%20API/Command/checkCallback.md?plain=1#L23) under "Example": does not compile, `TS2304: Cannot find name 'getRequiredValue'.`, at line 5 of the block (line 28 of the page).

## Reference > TypeScript API > Command > editorCallback

Docs page: <https://docs.obsidian.md/Reference/TypeScript+API/Command/editorCallback>

- [block at line 23](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/TypeScript%20API/Command/editorCallback.md?plain=1#L23) under "Example": does not compile, `TS2322: Type '(editor: Editor, view: MarkdownView) => void' is not assignable to type '(editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => any'.`, at line 4 of the block (line 27 of the page).

## Reference > TypeScript API > Command > editorCheckCallback

Docs page: <https://docs.obsidian.md/Reference/TypeScript+API/Command/editorCheckCallback>

- [block at line 23](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/TypeScript%20API/Command/editorCheckCallback.md?plain=1#L23) under "Example": does not compile, `TS2322: Type '(checking: boolean, editor: Editor, view: MarkdownView) => boolean' is not assignable to type '(checking: boolean, editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => boolean | void'.`, at line 4 of the block (line 27 of the page).

## Reference > TypeScript API > debounce

Docs page: <https://docs.obsidian.md/Reference/TypeScript+API/debounce>

- [block at line 37](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/TypeScript%20API/debounce.md?plain=1#L37) under "Example": command `Docs: debounce > Example`, module `reference/typescript-api/debounce/01-example.ts`.

## Reference > TypeScript API > FileManager > processFrontMatter

Docs page: <https://docs.obsidian.md/Reference/TypeScript+API/FileManager/processFrontMatter>

- [block at line 43](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/TypeScript%20API/FileManager/processFrontMatter.md?plain=1#L43) under "Example": does not compile, `TS2304: Cannot find name 'value'.`, at line 2 of the block (line 45 of the page).

## Reference > TypeScript API > Vault > process

Docs page: <https://docs.obsidian.md/Reference/TypeScript+API/Vault/process>

- [block at line 37](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/TypeScript%20API/Vault/process.md?plain=1#L37) under "Example": command `Docs: process > Example`, module `reference/typescript-api/vault/process/01-example.ts`.

## Reference > TypeScript API > View > scope

Docs page: <https://docs.obsidian.md/Reference/TypeScript+API/View/scope>

- [block at line 23](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/TypeScript%20API/View/scope.md?plain=1#L23) under "Example": does not compile, `TS2339: Property 'scope' does not exist on type 'DocsThis'.`, at line 1 of the block (line 24 of the page).

## Reference > Versions

Docs page: <https://docs.obsidian.md/Reference/Versions>

- [block at line 15](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/Versions.md?plain=1#L15): not runnable, a JSON sample (a manifest, `versions.json`, `data.json` or a config file), not plugin code.
- [block at line 28](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Reference/Versions.md?plain=1#L28): not runnable, a JSON sample (a manifest, `versions.json`, `data.json` or a config file), not plugin code.

## Themes > App themes > Build a theme

Docs page: <https://docs.obsidian.md/Themes/App+themes/Build+a+theme>

- [block at line 26](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Build%20a%20theme.md?plain=1#L26) under "Step 1: Download the sample theme": not runnable, shell commands, not plugin code.
- [block at line 32](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Build%20a%20theme.md?plain=1#L32) under "Step 1: Download the sample theme": not runnable, shell commands, not plugin code.
- [block at line 57](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Build%20a%20theme.md?plain=1#L57) under "Step 3: Update the manifest": not runnable, shell commands, not plugin code.
- [block at line 74](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Build%20a%20theme.md?plain=1#L74) under "Step 4: Change the font": not runnable, Markdown, not plugin code.
- [block at line 80](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Build%20a%20theme.md?plain=1#L80) under "Step 4: Change the font": command `Docs: Build a theme > Step 4: Change the font (2)`, module `themes/app-themes/build-a-theme/05-step-4-change-the-font.ts`.
- [block at line 94](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Build%20a%20theme.md?plain=1#L94) under "Step 5: Change the background color": command `Docs: Build a theme > Step 5: Change the background color`, module `themes/app-themes/build-a-theme/06-step-5-change-the-background-color.ts`.
- [block at line 134](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Build%20a%20theme.md?plain=1#L134) under "Step 6: Change the input hover border color": command `Docs: Build a theme > Step 6: Change the input hover border color`, module `themes/app-themes/build-a-theme/07-step-6-change-the-input-hover-border-col.ts`.
- [block at line 173](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Build%20a%20theme.md?plain=1#L173) under "Step 7: Discover CSS variables in use": command `Docs: Build a theme > Step 7: Discover CSS variables in use`, module `themes/app-themes/build-a-theme/08-step-7-discover-css-variables-in-use.ts`.

## Themes > App themes > Embed fonts and images in your theme

Docs page: <https://docs.obsidian.md/Themes/App+themes/Embed+fonts+and+images+in+your+theme>

- [block at line 12](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Embed%20fonts%20and%20images%20in%20your%20theme.md?plain=1#L12) under "Use data URLs": not runnable, a CSS fragment with no selector, so there is no rule to apply.
- [block at line 21](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Embed%20fonts%20and%20images%20in%20your%20theme.md?plain=1#L21) under "Use data URLs": command `Docs: Embed fonts and images in your theme > Use data URLs (2)`, module `themes/app-themes/embed-fonts-and-images-in-your-theme/02-use-data-urls.ts`.

## Themes > App themes > Release your theme with GitHub Actions

Docs page: <https://docs.obsidian.md/Themes/App+themes/Release+your+theme+with+GitHub+Actions>

- [block at line 5](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Release%20your%20theme%20with%20GitHub%20Actions.md?plain=1#L5): not runnable, a YAML file (a GitHub Actions workflow), not plugin code.
- [block at line 35](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Release%20your%20theme%20with%20GitHub%20Actions.md?plain=1#L35): not runnable, shell commands, not plugin code.
- [block at line 43](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Release%20your%20theme%20with%20GitHub%20Actions.md?plain=1#L43): not runnable, shell commands, not plugin code.

## Themes > App themes > Theme guidelines

Docs page: <https://docs.obsidian.md/Themes/App+themes/Theme+guidelines>

- [block at line 11](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/App%20themes/Theme%20guidelines.md?plain=1#L11) under "Use CSS variables": command `Docs: Theme guidelines > Use CSS variables`, module `themes/app-themes/theme-guidelines/01-use-css-variables.ts`.

## Themes > Obsidian Publish themes > Best practices for Publish themes

Docs page: <https://docs.obsidian.md/Themes/Obsidian+Publish+themes/Best+practices+for+Publish+themes>

- [block at line 41](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/Obsidian%20Publish%20themes/Best%20practices%20for%20Publish%20themes.md?plain=1#L41) under "Small screens and mobile devices": command `Docs: Best practices for Publish themes > Small screens and mobile devices`, module `themes/obsidian-publish-themes/best-practices-for-publish-themes/01-small-screens-and-mobile-devices.ts`.

## Themes > Obsidian Publish themes > Build a Publish theme

Docs page: <https://docs.obsidian.md/Themes/Obsidian+Publish+themes/Build+a+Publish+theme>

- [block at line 13](https://github.com/obsidianmd/obsidian-developer-docs/blob/1c26772ac13d6e9870c865936d389fdfe694e742/en/Themes/Obsidian%20Publish%20themes/Build%20a%20Publish%20theme.md?plain=1#L13): command `Docs: Build a Publish theme`, module `themes/obsidian-publish-themes/build-a-publish-theme/01-intro.ts`.
