# Onboarding Media

The macOS companion onboarding uses five fixed sections:
`Welcome`, `Browser`, `Blockers`, `Analytics`, and `Tools`.

Each section can contain multiple slides. `Back` and `Next` move through the
slides inside the current section before changing the selected section.

## Export requirements

- Use a 16:9 canvas: `1920×1080` or `2560×1440`.
- Export UI screenshots as PNG.
- Export motion as H.264 MP4, 30 fps, preferably 6–20 seconds.
- Do not include an audio track unless narration is intentionally added later.
- Optionally export `<media-name>-poster.png` for each video thumbnail.
- Use seeded demo data and local test pages.
- Hide personal tabs, profiles, email addresses, browsing history, bookmarks,
  notifications, and unrelated extensions.

## Capture list

| Filename | What to capture |
| --- | --- |
| `welcome-overview` | A 15–20 second overview: popup, protection status, analytics, and tools. |
| `browser-install` | Loading the unpacked extension on `chrome://extensions`. |
| `browser-pin` | Pinning Browser Monitor from Chrome's Extensions menu. |
| `browser-popup` | Opening the popup on a neutral test site. |
| `blockers-protection` | A before/after page load with the blocking counter changing. |
| `blockers-site-control` | Site exception and temporary protection pause. |
| `blockers-link-safety` | The local suspicious-link warning using a test URL. |
| `analytics-blocking` | Statistics with seeded chart and top-site data. |
| `analytics-activity` | Activity with demo domains and one expanded explanation. |
| `tools-overview` | Popup tool row and tool reordering. |
| `tools-pip` | Picture-in-Picture using project-owned or royalty-free video. |
| `tools-element-blocker` | Element picker selection and the resulting hidden element. |
| `tools-settings` | Slow navigation through every Settings section. |

Files belong in
`MacApp/Sources/BrowserMonitorApp/Resources/OnboardingMedia/`.
Accepted extensions are PNG, JPG, WebP, MP4, MOV, and M4V.

Related notes: [[Product]], [[Architecture]], [[Features]].
