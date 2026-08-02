# Architecture

Browser Monitor contains a Chrome Manifest V3 extension in `Extension/`, a SwiftUI macOS companion in `MacApp/`, and optional feedback infrastructure in `cloudflare/feedback-worker/`.

## Components

| Component | Responsibility |
| --- | --- |
| `manifest.json` | Extension entry points, permissions, content scripts, and DNR rules. |
| `service-worker.js` | Chrome events, network rules, tabs, local aggregates, and screen communication. |
| `content.js`, `page-guard.js` | Page protection and pure link/search/Crypto/video helpers. |
| `video-resume-frame.js` | HTML5 video resume inside cross-origin frames. |
| `popup.*`, `options.*` | Current-site tools and settings. |
| `statistics*`, `activity*` | Local blocking and activity reports. |
| `link-warning.*`, `feedback.*` | Link warning and explicit feedback submission. |
| `MacApp/` | macOS 14+ browser picker, local extension guide, release lookup, ZIP download, and signed companion updates. |
| `cloudflare/feedback-worker/` | Optional feedback-to-email endpoint with secrets stored in Cloudflare. |

The macOS app uses SwiftPM and separates app state, models, services, stores, support code, and views. Browser destinations and availability live in `BrowserOption.catalog`; `GitHubReleaseService` and `ReleaseDownloadManager` fetch and save extension archives only after user action. `UpdateService` adapts Sparkle state for the About control; Sparkle owns appcast scheduling, EdDSA verification, download, installation, and relaunch. A SwiftUI singleton utility window presents the bundled two-page extension guide, while a narrow AppKit bridge handles the card-anchored install panel.

## Data

- Extension state uses `chrome.storage.local`.
- Activity analytics stores domains and daily active/reading/video aggregates for up to 90 days.
- Privacy receipt data is visit-scoped memory; Crypto Guard keeps an address fingerprint for up to five minutes.
- Video resume keeps up to 100 sanitized records for 90 days; redirect history keeps up to 100 domain-only chains for 30 days.
- Credentials and known tracking/session parameters are removed from stored URLs.

## Constraints

- Optional capabilities request optional permissions only when used; network filtering remains within Chrome DNR limits.
- Content scripts are event-driven and avoid continuous full scans in hidden tabs.
- Statistics and Activity reuse one utility window each; other extension pages reuse tabs.
- User data remains local except for explicit feedback, user-enabled external features, companion release downloads, and signed appcast checks.
- The feedback Worker stores no database records. The macOS app performs no background monitoring.
- Companion update discovery uses a six-hour Sparkle schedule. Automatic download is disabled, and the GitHub release DMG must have a valid EdDSA signature in `appcast.xml` before Sparkle offers installation.
- A checked-in empty appcast keeps the pre-release channel valid. Manual checks distinguish an unavailable update, a verified update that Sparkle offers for installation, and feed/check failures.

See [[Features]] for behavior and [[Product]] for product boundaries.
