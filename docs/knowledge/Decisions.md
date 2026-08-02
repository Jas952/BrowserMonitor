# Decisions

Concise technical decisions that affect Browser Monitor behavior.

## Popup

- Tools uses a controlled paginated carousel with four equal items instead of free horizontal scrolling. Page positions use every fifth item's actual location, so gaps and an incomplete final page do not break snapping.
- Carousel arrows are regular buttons shown on `hover` or `focus-within`; there is no automatic navigation.
- Tool reordering moves the original element without a visual duplicate. Neighboring items use a FLIP transition, and the order is stored locally.
- Tool paging uses a controlled `requestAnimationFrame` animation instead of native smooth scrolling, so page movement stays visually consistent in the popup.
- The main switch state is applied before removing the `preload` class. Initial markup matches the normal enabled state, preventing a false off-to-on animation when the popup opens.
- Only the list scrolls in the duplicate-tabs panel; the primary action remains fixed at the bottom.
- Statistics and Activity each reuse one dedicated popup window without creating a detached copy of the main extension popup. Feedback and receipt details reuse browser tabs.
- Feedback sends an explicit form submission to a configured Cloudflare Worker endpoint instead of GitHub Issues or `mailto:`. The extension keeps a bounded local outbox copy, and provider credentials stay only in Cloudflare secrets.

Related notes: [[Architecture]], [[Features]], [[Product]].

## macOS companion updates

- Use Sparkle 2.9.4 with an HTTPS appcast and EdDSA-signed GitHub release DMGs.
- Scheduled checks run every six hours, but background download and silent installation are disabled. The user starts Download, Install, and Relaunch through Sparkle's standard UI.
- Ad-hoc packaging supports the current unknown-developer distribution model. It does not remove the first-install Gatekeeper warning or replace future Developer ID signing and notarization.
- Release tags provide the marketing version, while the GitHub Actions run number provides a monotonically increasing bundle build number.

Related notes: [[Architecture]], [[Features]], [[GitHubAndReleases]], [[Product]].
