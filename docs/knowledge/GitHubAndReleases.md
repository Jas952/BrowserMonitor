# GitHub and Releases

This document defines the standard for Browser Monitor GitHub content, README updates, and future releases.

## Principles

- GitHub content is written for product users, not as an engineering log.
- Focus on new capabilities, visible behavior changes, and user value.
- Release notes omit internal function names, files, APIs, CSS selectors, implementation limits, test fixtures, and refactoring details.
- Combine small fixes, compatibility work, optimization, and visual changes into one general statement.
- Never claim that a feature shipped unless it is in the release ZIP and passed the required checks.
- State privacy changes, new permissions, and external network interactions explicitly.

## Versioning

Use `MAJOR.MINOR.PATCH`:

- `PATCH`: fixes, optimization, and small improvements to existing capabilities.
- `MINOR`: a visible new user capability or major product expansion.
- `MAJOR`: an incompatible change to the product, data, or main user flow.

Before release, use one version in:

- `Extension/manifest.json`;
- the README badge and ZIP name in installation instructions;
- `docs/knowledge/Product.md`;
- Git tag `vX.Y.Z`;
- the GitHub Release title and assets.

## GitHub Release format

Write release notes in English:

```markdown
## What's new

- three to six user-visible changes;
- each point explains value rather than implementation;
- related small changes are combined.

New tools must be highlighted as a separate list inside `What's new`:

```markdown
## What's new

New tools:

- first new tool and the problem it solves;
- second new tool and the problem it solves.

Other changes:

- visible improvement or compatibility update;
- reliability and polish summary.
```

## Install

1. Download `browser-monitor-X.Y.Z.zip` below.
2. Extract the archive to a permanent folder.
3. Open `chrome://extensions` and enable **Developer mode**.
4. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.
5. Pin Browser Monitor to the Chrome toolbar.
```

The version already appears in the GitHub Release title, so do not repeat it in the description. Do not add separate `Improvements`, `Downloads`, or `Privacy` sections: combine small improvements under `What's new`, let GitHub display assets, and keep permanent privacy information in the README and Privacy Policy.

## Describing changes

Good:

- `Improved protection against video advertising on supported sites.`
- `Added local activity insights for reading and video time.`
- `General reliability and performance improvements across browser protection and analytics.`

Avoid:

- lists of changed functions and files;
- internal rule numbers or limits;
- descriptions of every fixed selector;
- separate points for reduced polling, timeout changes, or internal mutation fixes;
- long lists of small spacing and button-state changes.

When many small changes matter, combine them into one `What's new` item. Keep technical detail in commit history, tests, and knowledge documentation.

## README

The README describes the current stable product:

- concise purpose;
- main user capabilities;
- local-first and privacy position;
- current version;
- installation of the latest ZIP;
- link to the latest GitHub Release;
- contact details and related projects.

The README must not become a changelog. Update obsolete capabilities and old ZIP versions with each release.

## Release process

1. Match claimed capabilities against the actual code.
2. Update the version in every required location.
3. Prepare the GitHub Release text using the standard format.
4. Run the main extension test suite.
5. Build the ZIP with the release builder.
6. Verify the archive name, manifest version, ZIP contents, and SHA-256.
7. Commit the release scope separately.
8. Push changes to GitHub and confirm that the release commit is on the main branch.
9. Create tag `vX.Y.Z`.
10. Create the GitHub Release and attach the ZIP and `SHA256SUMS.txt`.
11. Verify the published page, text, tag, and both asset downloads.

## Prohibited actions

- Do not publish a tag before successful build and tests.
- Do not overwrite an existing release tag with another build.
- Do not commit local `.obsidian`, `.codebase-memory`, temporary screenshot, or Codex service directories.
- Do not publish secrets, cookies, local browser profiles, or user data.
- Do not describe a draft or unverified capability as released.

## Related notes

- [[Product]]
- [[Architecture]]
- [[Features]]
- [[Opportunities]]
