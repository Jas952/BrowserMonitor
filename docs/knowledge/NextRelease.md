# Next Release

Draft content for the next Browser Monitor GitHub release. Add only completed and verified user-visible changes. Keep each item short and describe user value rather than implementation.

## What's new

New tools:

- Added a native macOS companion with a fullscreen media tour, browser picker, and guided Chrome installation from the Web Store or latest published ZIP.

<!-- Add completed user-facing tools here. Explain the problem each tool solves. -->

Other changes:

- Refined the macOS companion with a shorter browser picker, an outside-window install popover, macOS/Windows badges, visible Replay and Settings actions, and an About view that isolates GitHub's Star control against a muted toolbar.
- Fixed Yandex search cleanup so the search bar and navigation remain visible while ad blocks are still hidden.
- Fixed Continue Watching so the in-page prompt opens the saved video URL and reapplies the stored timestamp.
- Fixed compatibility with iframe-based video sites whose player placeholder starts empty before the embedded player loads.

<!-- Add completed fixes and improvements here. Combine related small changes. -->

## Rules

- Add an item after the related implementation and checks are complete.
- Put a new user-facing capability under `New tools`.
- Put fixes, compatibility work, performance improvements, and UI polish under `Other changes`.
- Do not add plans, implementation details, file names, test fixtures, or unverified work.
- Before release, remove empty categories and use this note as the GitHub Release `What's new` draft.

Related notes: [[GitHubAndReleases]], [[Features]].
