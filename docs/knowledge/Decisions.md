# Decisions

Concise technical decisions that affect Browser Monitor behavior.

## Popup

- Tools uses a controlled paginated carousel with four equal items instead of free horizontal scrolling. Page positions use every fifth item's actual location, so gaps and an incomplete final page do not break snapping.
- Carousel arrows are regular buttons shown on `hover` or `focus-within`; there is no automatic navigation.
- Tool reordering moves the original element without a visual duplicate. Neighboring items use a FLIP transition, and the order is stored locally.
- Tool paging uses a controlled `requestAnimationFrame` animation instead of native smooth scrolling, so page movement stays visually consistent in the popup.
- The main switch state is applied before removing the `preload` class. Initial markup matches the normal enabled state, preventing a false off-to-on animation when the popup opens.
- Only the list scrolls in the duplicate-tabs panel; the primary action remains fixed at the bottom.
- Statistics, Activity, feedback, and receipt detail windows first open or reuse a detached popup companion and return focus to it when the child window closes, so the extension remains available for the next action.
- Feedback sends an explicit form submission to a configured Cloudflare Worker endpoint instead of GitHub Issues or `mailto:`. The extension keeps a bounded local outbox copy, and provider credentials stay only in Cloudflare secrets.

Related notes: [[Architecture]], [[Features]], [[Product]].
