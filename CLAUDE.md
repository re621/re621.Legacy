# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RE621 is a browser userscript that enhances the e621.net user experience. It is written in TypeScript, compiled and bundled for browser injection via Tampermonkey. The runtime target is `e621.net` — all modules and DOM manipulation assume that page context.

The Chrome extension build pipeline still exists in the repo but the extension is abandoned and not maintained. Only the userscript is functional.

## Build Commands

Requires [Bun](https://bun.sh/) as the package manager and task runner.

```bash
bun i                      # Install dependencies
bun run build:prod         # Production build (TypeScript + SASS + compose + cleanup)
bun run build:dev          # Development build
bun run eslint             # Lint all TypeScript files
bun run injector:chrome    # Create a local file injector userscript for Chrome
bun run injector:firefox   # Create a local file injector for Firefox (requires TamperDAV)
```

Build artifacts are placed in `/build/`. The build produces both `script.user.js` (userscript) and a Chrome extension package.

There are no automated tests (`bun run test` is a no-op stub).

## Architecture

### Module System

All features are implemented as modules extending `RE6Module` ([src/js/components/RE6Module.ts](src/js/components/RE6Module.ts)). Each module is a singleton registered with `ModuleController`. The lifecycle is:

1. **`prepare()`** — loads settings from storage, runs before DOM is ready
2. **`create()`** — DOM manipulation and event listener setup; only runs if `canInitialize()` passes
3. **`destroy()`** — must undo everything `create()` did

`canInitialize()` checks: module is enabled, page matches the constraint regex(es), and all declared dependencies are enabled.

Modules declare which pages they run on via `PageDefinition` constants (passed as `constraint` to the constructor). An empty constraint means all pages.

Settings are stored per-module under the key `re621.<ClassName>` in XM/localStorage. Use `fetchSettings(key)` / `pushSettings(key, value)` — never access storage directly in modules.

Cross-module communication uses jQuery custom events: `re621.module.<ClassName>.<event>`. Use the static `.on()`, `.off()`, `.trigger()` methods on module classes.

### Entry Point

[src/js/main.ts](src/js/main.ts) defines the `loadOrder` array and calls `ModuleController.register()`. Subscriptions are registered separately before the rest of the modules. To add a new module, import it and add it to `loadOrder`.

### Key Directories

- **[src/js/components/](src/js/components/)** — Core infrastructure (not feature modules):
  - `RE6Module.ts` / `ModuleController.ts` — module base and lifecycle controller
  - `api/` — `E621` (API client), `XM` (cross-environment storage/GM_* abstraction), `XMChrome` (extension bridge), `DownloadQueue`
  - `data/` — `Page` (current page detection + `PageDefinition` enum), `User`, tag/post data models
  - `cache/` — `AvoidPosting` and other caches initialized at startup
  - `structure/` — `CleanSlate` (initial DOM scaffolding), `StartupTasks`
  - `utility/` — `Debug`, `Patcher` (config migration), `Util`, `VersionChecker`, `ErrorHandler`

- **[src/js/modules/](src/js/modules/)** — Feature modules grouped by area:
  - `general/` — site-wide UI (header, themes, settings controller, formatting)
  - `post/` — post view page (viewer, image scaler, pool navigation, download)
  - `search/` — search results (BetterSearch, blacklist, hover zoom, flags, filters)
  - `misc/` — tag/wiki tools, smart alias, upload utilities, edit tracker
  - `downloader/` — fav/pool/mass download managers
  - `subscriptions/` — `_SubscriptionManager` base + tag/pool/forum/comment trackers

- **[src/scss/](src/scss/)** — SASS stylesheets mirroring the module directory structure

- **[bin/](bin/)** — Build scripts: `userscript.js`, `extension.js`, `common.js` (template processing), `cleanup.js`

### XM Abstraction Layer

`XM` ([src/js/components/api/XM.ts](src/js/components/api/XM.ts)) abstracts Greasemonkey/Tampermonkey APIs and Chrome extension messaging. Always use `XM.Storage` for persistent storage, `XM.Connect` for cross-origin requests, etc. — never call `GM_*` functions directly.

### Page Detection

`Page.matches(PageDefinition.xxx)` checks the current URL. `PageDefinition` is an enum of regex patterns. Use this to guard page-specific logic rather than inspecting `window.location` manually.
