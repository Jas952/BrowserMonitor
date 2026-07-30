# Architecture

Browser Monitor consists of a Chrome Manifest V3 extension without a backend or bundler and a native SwiftUI companion app for macOS. Extension runtime code lives in `Extension/`; the companion app lives in `MacApp/`.

## Components

| Component | Responsibility |
| --- | --- |
| `manifest.json` | Entry points, permissions, content scripts, and DNR rules. |
| `service-worker.js` | Chrome events, network rules, tabs, local aggregates, and communication between screens. |
| `content.js` | Protection and DOM controls in the top-level document. |
| `page-guard.js` | Pure helpers for links, search results, Crypto Guard, and video identity. |
| `video-resume-frame.js` | HTML5 video resume inside cross-origin frames only. |
| `popup.*` | Current-site status and quick tools. |
| `options.*` | Settings and optional permission requests. |
| `statistics*`, `activity*` | Local blocking and activity reports. |
| `link-warning.*`, `feedback.*` | Link warning and explicit feedback submission. |
| `cloudflare/feedback-worker/` | Optional Cloudflare Worker that receives feedback requests and sends them through the configured email provider. |
| `MacApp/` | SwiftPM macOS 14+ app with compact browser selection, separate fullscreen onboarding, release lookup, and ZIP download. |
| `script/build_and_run.sh` | Single local entry point that builds, stages, and launches the macOS `.app` bundle. |

## macOS companion

- `AppState` owns browser selection and the persisted first-run onboarding flag.
- `OnboardingWindowCoordinator` is the narrow AppKit boundary that hides normal app windows and presents `OnboardingView` in a borderless window sized to the active display.
- `OnboardingView` owns the fixed `Welcome`, `Browser`, `Blockers`, `Analytics`, and `Tools` rail, a media-width progress track, and compact overlay navigation. It advances through nested slides before moving to the next section.
- `OnboardingMediaResolver` loads PNG/JPG/WebP images or MP4/MOV/M4V videos by stable media-slot name and falls back to an instructional placeholder.
- The compact main SwiftUI window presents Chrome, Edge, and Safari cards. Chrome is active; Edge and Safari are visible future targets. Platform badges distinguish macOS-only and macOS/Windows browsers.
- The Chrome card presents a SwiftUI install surface through the narrow `AnchoredPanelPresenter` AppKit bridge. Its borderless child `NSPanel` is positioned below the card and may extend beyond the compact main-window bounds; SwiftUI remains the source of truth for visibility and actions. Replay Intro and Settings remain visible in the window header and are also available through native app surfaces.
- Settings uses General and About tabs. About reads the bundle version, links to the repository, and includes a muted toolbar mockup with a dashed guide pointing to GitHub's highlighted upper-right Star/count/dropdown control.
- `GitHubReleaseService` reads `repos/Jas952/BrowserMonitor/releases/latest` and selects the uploaded ZIP asset.
- `ReleaseDownloadManager` saves the chosen asset to the user's Downloads folder without unpacking or installing it automatically.
- `ChromeIntegration` uses the installed Chrome application bundle for the official browser icon and opens `chrome://extensions` in Chrome.
- SwiftPM resources include current project-owned extension screenshots, the replaceable media catalog described in [[OnboardingMedia]], an Edge fallback icon from Microsoft's official Edge download CDN, and black/white GitHub Invertocat marks from the official GitHub Brand Toolkit.

## Data

- Primary storage: `chrome.storage.local`.
- Analytics stores a domain and daily active/reading/video aggregates for up to 90 days.
- The privacy receipt exists only in memory for the current visit.
- Crypto Guard stores only an address SHA-256 fingerprint for up to five minutes.
- Video resume stores up to 100 sanitized records for no longer than 90 days.
- The redirect map stores only domains and timestamps: up to 100 chains for 30 days.
- Full URLs are used only when a feature explicitly needs to return to a page or prepare a report; credentials and known tracking/session parameters are removed.

## Constraints

- Required permissions are declared in the manifest. `browsingData`, `cookies`, `downloads`, `history`, and clipboard capabilities are requested only when needed.
- Content scripts are event-driven; hidden tabs must not receive continuous full DOM scans.
- Network filtering is limited by Chrome DNR limits.
- Statistics and Activity each reuse one dedicated popup window. Reopening either surface focuses its existing window and removes older duplicates; Chrome's extension API cannot force it to stay always on top. Other extension pages reuse browser tabs.
- User data and decisions remain local except for an explicit feedback submission or a user-enabled external feature.
- The feedback Worker stores no database records. Email provider credentials are Cloudflare secrets and must not be shipped in the extension.
- The companion app performs no background monitoring. GitHub release lookup and ZIP download occur only after explicit user action.

See [[Features]] for behavior and [[Product]] for product boundaries.
