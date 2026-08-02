# Product

Browser Monitor is a local-first Chrome extension for safer browsing, reducing page noise, and analyzing browser activity locally. A companion macOS app introduces the extension visually and guides installation from the latest published GitHub Release.

Current release: 1.1.3.

## Principles

- Core protection works without an account or backend.
- User data stays in the Chrome profile.
- Sensitive features require an explicit action and use optional permissions where possible.
- Protection can be reverted or disabled for a specific site.
- Local heuristics are never presented as guaranteed security checks.
- Remote executable code, advertising SDKs, and hidden analytics are prohibited.

## Boundaries

- Platform: Google Chrome 120+, Manifest V3.
- Companion app platform: macOS 14+.
- The companion app supports Google Chrome first. Each browser's official store and ZIP source is configured in one local catalog, so more browsers can be enabled without changing the picker UI or extension package.
- The extension is not an antivirus and cannot guarantee that a site or file is safe.
- Network rules are limited by Declarative Net Request; page controls are limited by the available DOM.
- Link Safety, search result labels, and Crypto Guard operate locally and may produce errors.
- Activity history stores domains and aggregates, not page content.
- External data is used only by explicitly enabled features such as SponsorBlock or when the user sends a feedback request.
- Feedback delivery uses a Cloudflare Worker endpoint when configured. The request includes the reply email, message, optional screenshot, and relevant diagnostics shown by the form.
- Statistics and Activity each use one reusable utility window. Settings, feedback, and receipt details reuse browser tabs, and Browser Monitor never creates a detached copy of its main popup.
- The companion app has no account or analytics. It contacts GitHub after an explicit extension ZIP action and contacts the signed Sparkle appcast for manual or scheduled companion update checks. Download and installation of a companion update remain explicit user actions.

## macOS companion flow

- An `Info` action opens a compact guide window with a two-page gallery covering the extension's protection and tab insights, then its Settings.
- The main window presents Chrome as selected and previews Edge and Safari as future targets, with compact macOS and Windows compatibility badges.
- Selecting the Chrome card opens an anchored floating panel for a direct GitHub ZIP download or the official browser store; it floats outside the compact main-window bounds.
- Browser marketplace and archive destinations live in the `BrowserOption` catalog. A browser becomes interactive after its URLs and availability are configured there.
- The companion guide explicitly states that the macOS app is optional and is not required for the Chrome extension to work.
- Settings includes a compact About section with the companion version, project link, and a muted repository mini-preview that isolates and visually locates GitHub's full Star control.
- A compact update control beside the companion version opens Sparkle's standard Download, Install, and Relaunch flow. Scheduled checks run every six hours, while background download and silent installation stay disabled.
- When a Chrome Web Store listing becomes available, its official URL can replace or complement the GitHub ZIP flow.

Implemented capabilities are listed in [[Features]], implementation structure in [[Architecture]], and future ideas in [[Opportunities]].
