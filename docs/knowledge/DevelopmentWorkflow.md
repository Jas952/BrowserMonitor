# Development Workflow

Consult this note only for development tooling, gates, or releases.

## Tool roles

| Tool | Use |
| --- | --- |
| CodeGraph | Primary symbol, flow, architecture, and impact discovery. |
| codebase-memory | **Fallback only** for a specific CodeGraph gap or complex semantic/Cypher query; never duplicate a successful CodeGraph lookup. |
| `rg` through RTK | Literals, configuration, and documentation. |
| jCodeMunch | On-demand context/token analysis; core compact profile, no watcher. |
| OpenCodeReview | Explicit extended review only. |
| no-mistakes | Push, PR, and release gate. |

RTK wraps shell commands to reduce output. These tools are development-only and are not packaged with the product.

## Checks by scope

| Changed area | Required check |
| --- | --- |
| `Extension/` | `rtk npm --prefix Extension test` |
| `MacApp/` | `rtk swift test --package-path MacApp` |
| Release, manifest, packaging, or shared product behavior | Both test suites and `rtk node script/build_release.mjs` |
| Documentation or local agent config only | `git diff --check`; no product tests unless behavior changed. |

The release builder uses an allowlist; only its ZIP output is submitted to the Chrome Web Store.

## Review and publication

- For an explicit extended review, run `ocr delegate preview`, obtain relevant rules with `ocr delegate rule`, and review the selected files in the current agent.
- Before publication, inspect the change set and use no-mistakes from a feature branch. Do not run automatic approval from `main`.
- Keep generated builds, screenshots, tool caches, secrets, and local captures untracked.

## Measure usefulness

Every ten tasks, compare useful findings and time/token cost. Keep RTK savings, jCodeMunch context metrics, OCR findings, and no-mistakes rescue rate only when they influence decisions. Remove tools from the default path when they provide no measurable value.

Related notes: [[Architecture]], [[GitHubAndReleases]].
