# Features

Only implemented user-facing capabilities are listed here.

| Area | Available capability |
| --- | --- |
| Blocking | EasyList, EasyPrivacy, RU AdList, cryptomining rules, cosmetic filters, site exceptions, and manual element blocking. |
| Page noise | Cookie banner and intrusive prompt suppression, autoplay and floating video controls, and reversible Eco Mode. |
| Video | Protection on supported video sites, optional SponsorBlock, Picture-in-Picture, and long-form HTML5 video resume. |
| Link Safety | Local warnings for suspicious external links, an allowlist, and a dedicated warning page. |
| Search protection | Risk labels in Google, Bing, Yandex, DuckDuckGo, and Yahoo results. |
| Crypto Guard | Invisible-character cleanup and copy/paste substitution protection for recognized wallet addresses. |
| Privacy receipt | Local visit summary: prevented actions, third-party domains, and page-accessible cookies and storage. |
| History | Hiding selected domains from Chrome history and supported search suggestions after permission is granted. |
| Site data | Automatic cookie and origin storage removal after the last tab for a selected domain closes. |
| Statistics | Local blocking and activity reports: visits and active, reading, and video time. |
| Site Activity | Tab activity explanation and a map of recent cross-domain redirects. |
| Tab tools | Duplicate-tab detection and closing, plus a configurable popup tool order. |
| Feedback | Direct feedback request form via a configured Cloudflare endpoint after explicit user action. |
| Interface | Popup, Settings, Statistics, Activity, and warning pages in English and Russian, with a shared muted blue-gray shield identity across Chrome, GitHub media, and the companion app. Chrome's compact toolbar and standalone data/settings page headers use the same undistorted shield cut directly from the full app icon, without a numeric badge or color filters; store and popup surfaces retain the complete window-and-shield mark. Statistics and Activity reuse one dedicated window each; other extension pages reuse browser tabs. |
| macOS companion | Compact catalog-driven Chrome/Edge/Safari picker with the shared project icon, platform badges and per-browser store/ZIP destinations, a visually connected selection marker, a card-attached install panel with a softly fading arrow outline, a native Settings-sized two-page guide using unclipped interface captures, aligned General/About settings with project and GitHub Star guidance, and EdDSA-verified Sparkle updates from GitHub releases through a compact version-adjacent control. |

## Main limitations

- Link and search result protection relies on heuristics.
- Cosmetic filtering and video controls depend on each site's structure.
- Video resume works only with recognized long-form HTML5 video. YouTube watch pages use the `v` route value and the current visible title so client-side navigation keeps each video separate.
- Activity analytics excludes background and inactive tabs.
- SponsorBlock uses an external community source only when enabled.
- Direct feedback sending requires a deployed Cloudflare Worker endpoint and configured email provider secret.

See [[Architecture]] for technical details and [[Opportunities]] for future ideas.
