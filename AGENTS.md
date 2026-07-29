@/Users/dmitriy/.codex/RTK.md

<!-- codebase-memory-mcp:start -->
# Codebase Knowledge Graph (codebase-memory-mcp)

This project uses codebase-memory-mcp to maintain a knowledge graph of the codebase.
ALWAYS prefer MCP graph tools over grep/glob/file-search for code discovery.

## Priority Order
1. `search_graph` - find functions, classes, routes, variables by pattern
2. `trace_path` - trace who calls a function or what it calls
3. `get_code_snippet` - read specific function/class source code
4. `query_graph` - run Cypher queries for complex patterns
5. `get_architecture` - high-level project summary

## When to fall back to grep/glob
- Searching for string literals, error messages, config values
- Searching non-code files (Dockerfiles, shell scripts, configs)
- When MCP tools return insufficient results

## Examples
- Find a handler: `search_graph(name_pattern=".*OrderHandler.*")`
- Who calls it: `trace_path(function_name="OrderHandler", direction="inbound")`
- Read source: `get_code_snippet(qualified_name="pkg/orders.OrderHandler")`
<!-- codebase-memory-mcp:end -->

--- project-doc ---

@/Users/dmitriy/.codex/RTK.md

# Browser Monitor - Codex Instructions

## General rules

- This folder is the Obsidian vault for Browser Monitor. Core notes are in `docs/knowledge/`.
- Read the related notes in `docs/knowledge/` before starting a task.
- Use only this project's local `docs/knowledge/` as Browser Monitor working memory. Do not use knowledge files from neighboring projects.
- Do not modify `.obsidian/` unless the task specifically concerns Obsidian configuration.
- Do not remove existing functionality without an explicit request.
- Do not add dependencies without justification.
- Preserve the local-first model: no account, backend analytics, or user data sent to the developer.
- Before creating a module, find similar implementations in `Extension/`.
- Account for Manifest V3 and Chrome extension API constraints.

## Agent tools and cost

Use installed agent-cycle tools only when they reduce risk, token use, or manual work. Do not run checks whose results cannot affect the task.

- `rtk-ai/rtk`: run every shell command through `rtk` as described in `/Users/dmitriy/.codex/RTK.md`; MCP and built-in Codex tools are the only exceptions.
- `codebase-memory-mcp`: primary source for code discovery. Before `rg` or manual code reading, use `search_graph`, `trace_path`, `get_code_snippet`, `query_graph`, or `get_architecture`. Use `rg` for literals, config, documentation, or when the graph is insufficient.
- `colbymchenry/codegraph`: use `codegraph_*` MCP tools for fast local symbol, impact, and architecture queries, especially before code changes. If `codegraph_status` says the project is not initialized, run `rtk codegraph init` once.
- `jgravelle/jcodemunch-mcp`: when its MCP tools are available for an indexed repository, prefer them over grep/glob/read for symbol, context, and impact tasks. If only `jcodemunch_guide` is available, do not simulate missing commands; use `codebase-memory-mcp` or `codegraph`.
- `alibaba/open-code-review`: for review requests, run `ocr delegate preview` and `ocr delegate rule`, then perform the review yourself using the selected files and rules. Always limit review scope with `--exclude ".cache/**,.codebase-memory/**,.codegraph/**,.obsidian/**,output/**,testing_workspace/**,venv/**"` or narrower paths. Run full `ocr review` only when a separate LLM review session is needed.
- `kunchenguid/no-mistakes`: for push, PR, release preparation, or an explicit gate request, use `no-mistakes status`, `doctor`, `runs`, `rerun`, `attach`, or `axi`. Do not replace the normal `rtk npm --prefix Extension test` check for small changes.
- `headroomlabs-ai/headroom`: use for structural diff/search/LOC and context optimization, limited to project areas such as `Extension`, `script`, `docs`, and key root files. Exclude `venv`, `.cache`, `.codebase-memory`, `.obsidian`, `output`, `testing_workspace`, `node_modules`, and other generated or vendor directories.

Default order:
1. Understand code with `codebase-memory-mcp` or `codegraph`.
2. Search targeted text, config, and documentation with `rg` through `rtk`.
3. Validate changes with project tests through `rtk`; use `ocr` or `no-mistakes` only for review, gate, push, PR, or elevated risk.
4. Use `headroom` for scoped overview metrics only, excluding vendor and generated directories.

## Required workflow

For tasks that change code, extension behavior, builds, permissions, privacy, or architecture, follow this cycle automatically:

1. Before analysis and editing, read only the short notes related to the task:
   - `docs/knowledge/Product.md` for purpose and product boundaries;
   - `docs/knowledge/Architecture.md` for components, data, and technical constraints;
   - `docs/knowledge/Features.md` for implemented capabilities;
   - `docs/knowledge/Opportunities.md` only for new ideas.
2. Compare the request with actual code and existing decisions. Do not treat documentation as more authoritative than implementation; correct any discrepancy in the notes.
3. After code changes, run appropriate checks. For normal Browser Monitor changes, use:

   ```bash
   rtk npm --prefix Extension test
   ```

4. After validation, review and update when needed:
   - `docs/knowledge/Architecture.md`;
   - `docs/knowledge/Features.md`;
   - `docs/knowledge/Opportunities.md`.
5. Also update `docs/knowledge/Product.md` when purpose, user flow, permissions, or privacy behavior changes.
6. In the final response, state which checks ran and which notes changed. If a check could not run, explain why and do not claim it passed.

For questions, code reading, and tasks that do not change behavior, avoid documentation churn. Read only related notes and edit them only when they contain incorrect or outdated information.

## Visual validation and screenshots

- Create a screenshot when adding a feature or visibly changing the popup, options, statistics, warning page, side panel, separate tab, or another UI state.
- Show the screenshot directly in chat so the user does not need to load the extension and find the changed screen.
- First try the project's standard Chrome E2E scenario:

  ```bash
  rtk env BROWSER_MONITOR_SCREENSHOT_PATH=output/screenshots/browser-monitor.png node script/test_chrome_e2e.mjs
  ```

- Store screenshots in `output/screenshots/` with clear names such as `popup.png`, `options-link-safety.png`, `statistics.png`, or `warning-page.png`.
- In the final response, embed images with an absolute path, for example: `![Popup](/Users/dmitriy/Docs/project/MacCleanerBrowser/output/screenshots/popup.png)`.
- If automatic capture fails, explain why and provide the best available alternative: a Playwright or Chrome screenshot, a failure screenshot, or a path to the verified HTML page.
- Do not claim visual validation unless a screenshot was created and inspected.

## Code

- The project is a Chrome Manifest V3 extension in `Extension/`.
- Keep the service worker, popup, options, content scripts, and auxiliary pages separated by responsibility.
- Do not put heavy or long-lived work in a content script without a clear need.
- Optional capabilities should use `optional_permissions` where possible.
- Reflect permission and privacy-model changes in `docs/knowledge/Product.md` and the manifest.
- Do not load remote executable code or add external analytics SDKs.
- DNR and filter-list changes must account for Chrome limits and list provenance.
- Prefer `chrome.storage.local` and clear local retention rules for user data.

## Documentation

For significant behavior changes, update the relevant files:

- `docs/knowledge/Product.md`: purpose, boundaries, and privacy model.
- `docs/knowledge/Architecture.md`: architecture, components, and data flow.
- `docs/knowledge/Features.md`: implemented capabilities and constraints.
- `docs/knowledge/Opportunities.md`: modernization and new-tool ideas only.

Document:

- why a component exists;
- what problem it solves;
- why a decision was made;
- known constraints;
- affected project areas.

Do not document every line of code.

## Obsidian format

- Use internal links as `[[Note Name]]`.
- Record pending tasks as `- [ ] Description`.
- Record completed tasks as `- [x] Description`.
- Do not invent implemented capabilities, test results, or project state.
- Write documentation in English unless a task requires another language.

<!-- codebase-memory-mcp:start -->
# Codebase Knowledge Graph (codebase-memory-mcp)

This project uses codebase-memory-mcp to maintain a knowledge graph of the codebase.
ALWAYS prefer MCP graph tools over grep/glob/file-search for code discovery.

## Priority Order
1. `search_graph` - find functions, classes, routes, variables by pattern
2. `trace_path` - trace who calls a function or what it calls
3. `get_code_snippet` - read specific function/class source code
4. `query_graph` - run Cypher queries for complex patterns
5. `get_architecture` - high-level project summary

## When to fall back to grep/glob
- Searching for string literals, error messages, config values
- Searching non-code files (Dockerfiles, shell scripts, configs)
- When MCP tools return insufficient results
<!-- codebase-memory-mcp:end -->
