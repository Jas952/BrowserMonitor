# Development Workflow

## Tool responsibilities

The project uses three independent validation layers:

1. **jCodeMunch** provides local indexing and targeted symbol extraction. It supplements the main knowledge graph rather than replacing it: `codebase-memory-mcp` remains the first choice for architecture, relationships, and call paths; jCodeMunch is used for narrow symbol reads, budgets, and token savings measurement.
2. **OpenCodeReview** deterministically selects changed files and review rules. Delegation mode is the default: the current Codex performs the review, so no separate API key or source upload to another LLM provider is required.
3. **no-mistakes** is a local Git gate before publication. It validates changes in a separate worktree, runs review, tests, documentation, and lint, then can pass the branch to `origin` and open a PR.

These tools affect only development. They are not included in the Chrome extension, do not change permissions, and do not add product telemetry.

## Repository boundaries

- `Extension/` contains the Chrome Web Store product and its tests.
- `MacApp/` contains the separately built macOS companion and its tests.
- `cloudflare/feedback-worker/` is optional deployment infrastructure and is never packaged with the extension.
- `script/` contains only maintained build or data-update entry points.
- `docs/` contains policy, release, product-memory, and repository presentation files.
- Generated builds, screenshots, tool caches, secrets, and local media captures stay untracked through the root `.gitignore`.

Keep the extension runtime files at the top level of `Extension/` unless a feature has a clear reusable module boundary. The manifest and extension pages load these files directly, so cosmetic directory moves add release risk without improving runtime efficiency.

The macOS companion follows SwiftPM conventions and groups implementation by responsibility under `App`, `Models`, `Services`, `Stores`, `Support`, and `Views`.

## Daily workflow

### During a task

- Use `codebase-memory-mcp` first for architecture and relationship discovery.
- Use jCodeMunch for targeted code reads and context cost analysis.
- After behavior changes, run the required check:

```bash
rtk npm --prefix Extension test
rtk swift test --package-path MacApp
rtk node script/build_release.mjs
```

The release builder uses an explicit allowlist. Only its ZIP output is submitted to the Chrome Web Store; repository tests, documentation, the macOS app, and Cloudflare infrastructure are excluded.

### Before a commit

Preview the files selected by OpenCodeReview:

```bash
ocr delegate preview
```

Get rules for the selected files:

```bash
ocr delegate rule Extension/content.js Extension/service-worker.js
```

In Codex, request: "Use open-code-review-delegate and review the current changes." Delegation mode does not require LLM configuration in `ocr`.

### Before publication

Confirm that Git contains no temporary directories or unintended large files. Then create a normal commit on a feature branch and send it through the local gate:

```bash
git push no-mistakes <branch-name>
no-mistakes
```

Do not use the gate from `main` or run `no-mistakes -y` before manually reviewing the change set. Automatic mode can approve fixes and prepare a PR.

## Diagnostics and dashboards

### jCodeMunch

```bash
jcodemunch-mcp config --check
jcodemunch-mcp surface --json
```

The MCP tools `get_session_stats` and `analyze_perf` report emitted tokens, repeated reads, token yield, tool-schema cost, and latency. Long-term local performance telemetry is stored in `~/.code-index/telemetry.db`.

Installed version 1.108.170 incorrectly reports `share_savings: enabled` even when the documented value is set to `false` or `JCODEMUNCH_SHARE_SAVINGS=0` is provided. Therefore, anonymous aggregate telemetry cannot be claimed as disabled. Documentation says it excludes code, paths, and repository names, but until the upstream issue is fixed, jCodeMunch should not be used for closed source that requires a complete ban on background network access.

### OpenCodeReview

```bash
ocr session list
ocr viewer
```

`ocr viewer` opens a local viewer for saved review sessions. A full `ocr review` can use a separately configured external LLM provider and token budget, but the default project workflow uses delegation mode.

### no-mistakes

```bash
no-mistakes status
no-mistakes runs
no-mistakes stats
no-mistakes stats --agents
no-mistakes doctor
```

`stats` reports detected and fixed errors, rescue rate, and repository results. `stats --agents` adds local time and token metrics. History is stored locally in `~/.no-mistakes/state.sqlite`.

### RTK

```bash
rtk gain
rtk gain --history
```

This is the primary shell-output savings meter. It reports the absolute number and percentage of tokens saved by command.

## Evaluation after 10 tasks

After ten normal tasks, compare:

- RTK and jCodeMunch savings;
- repeated symbol output and jCodeMunch token yield;
- useful OpenCodeReview findings and false positives;
- no-mistakes rescue rate and time to a green PR;
- added pipeline time versus prevented defects.

If a tool provides no measurable benefit, remove it from the required path and keep it diagnostic only.

## Related notes

- [[Architecture]]
- [[Features]]
- [[Opportunities]]
