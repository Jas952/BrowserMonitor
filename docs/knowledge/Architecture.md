# Architecture

Browser Monitor is a Chrome Manifest V3 extension without a backend or bundler. Runtime code lives in `Extension/`.

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
| `link-warning.*`, `feedback.*` | Link warning and explicit email feedback preparation. |

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
- User data and decisions remain local except for an explicit email handoff or a user-enabled external feature.

See [[Features]] for behavior and [[Product]] for product boundaries.
