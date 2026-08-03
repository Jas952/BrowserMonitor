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
- the macOS companion bundle produced from the release tag;
- the README badge and ZIP name in installation instructions;
- `docs/knowledge/Product.md`;
- Git tag `vX.Y.Z`;
- the GitHub Release title and assets.

## GitHub Release format

Write release notes in English:

```markdown
## What's new

New tools:

- first new tool and the problem it solves;
- second new tool and the problem it solves.

Other changes:

- visible improvement or compatibility update;
- reliability and polish summary.

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

## Brand assets

- Extension icons live in `Extension/icons/`.
- macOS companion imagery lives in `MacApp/Sources/BrowserMonitorApp/Resources/`.
- README and repository imagery in `docs/readme-media/` must use the same current icon as the extension and macOS companion.
- Chrome Web Store submission screenshots, promotional images, and store-only
  icon exports stay local and are ignored by Git.

## Repository settings

Current repository settings should support a public, local-first Chrome extension without requiring a website.

Recommended enabled settings:

- Secret scanning and push protection, because the repository contains release assets and development automation.
- Code scanning through the CodeQL workflow in `.github/workflows/codeql.yml`.
- Dependabot updates for GitHub Actions and the npm package metadata in `Extension/`.
- Private vulnerability reporting and the repository security policy in `SECURITY.md`.
- Branch protection for `main` before collaborative work or release automation grows.

Recommended repository metadata:

- Description: `Local-first Chrome extension for ad blocking, link protection, tab activity monitoring and browser privacy tools`.
- Topics: `chrome-extension`, `manifest-v3`, `privacy`, `browser-security`, `ad-blocker`, `tracker-blocker`, `phishing-protection`, `tab-monitoring`, `sponsorblock`, `javascript`.
- Social preview: use a product image from `docs/readme-media/` or a dedicated preview image that clearly shows Browser Monitor rather than a generic graphic.

Settings to leave empty or disabled for now:

- GitHub Pages, because Browser Monitor does not currently need a project website.
- GitHub Apps, unless a specific integration is needed for release automation, issue triage, or security workflows.
- Tags do not need manual setup beyond release tags named `vX.Y.Z`.

## Release process

1. Match claimed capabilities against the actual code.
2. Update the version in every required location.
3. Review `NextRelease.md` and prepare the GitHub Release text using the standard format.
4. Run both product test suites and build the extension ZIP locally.
5. Verify the archive name, manifest version, ZIP contents, and SHA-256.
6. Commit the release scope separately, push it, and confirm the release commit is on `main`.
7. Create and push tag `vX.Y.Z`. The release workflow validates the tag against the manifest, repeats both test suites, builds the extension ZIP and macOS DMG, signs the DMG appcast entry, and creates or updates the GitHub Release.
8. Verify the published page, text, tag, extension ZIP, macOS DMG, checksums, and appcast download. Confirm the workflow committed the generated `appcast.xml` to `main`.

The release workflow requires `SPARKLE_PRIVATE_KEY` in GitHub Actions secrets. Its matching public key is embedded in the companion app; never commit or print the private key. Each release tag must produce a strictly increasing macOS `CFBundleVersion`, and the app must be copied to a writable location such as `/Applications` before self-update. The current ad-hoc distribution still shows Gatekeeper's unknown-developer warning on first install; Sparkle's EdDSA verification secures later update packages but does not replace Developer ID signing or notarization.

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
- [[NextRelease]]
