# Decisions

Concise technical decisions that affect Browser Monitor behavior.

## Popup

- Tools uses a controlled paginated carousel with four equal items instead of free horizontal scrolling. Page positions use every fifth item's actual location, so gaps and an incomplete final page do not break snapping.
- Carousel arrows are regular buttons shown on `hover` or `focus-within`; there is no automatic navigation.
- Tool reordering moves the original element without a visual duplicate. Neighboring items use a FLIP transition, and the order is stored locally.
- The main switch state is applied before removing the `preload` class. Initial markup matches the normal enabled state, preventing a false off-to-on animation when the popup opens.
- Only the list scrolls in the duplicate-tabs panel; the primary action remains fixed at the bottom.
- Feedback opens a prefilled `mailto:` draft instead of GitHub Issues. The extension keeps a bounded local outbox copy, but the actual message is sent only by the user's mail app after explicit review.

Related notes: [[Architecture]], [[Features]], [[Product]].
