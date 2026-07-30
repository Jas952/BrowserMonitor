import Foundation

enum OnboardingSectionID: String, CaseIterable, Identifiable {
    case welcome = "Welcome"
    case browser = "Browser"
    case blockers = "Blockers"
    case analytics = "Analytics"
    case tools = "Tools"

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .welcome: "globe"
        case .browser: "puzzlepiece.extension"
        case .blockers: "shield.checkered"
        case .analytics: "chart.bar.xaxis"
        case .tools: "wrench.and.screwdriver"
        }
    }
}

struct OnboardingSlide: Identifiable, Equatable {
    let id: String
    let title: String
    let detail: String
    let captureHint: String
    let mediaName: String
}

struct OnboardingSection: Identifiable, Equatable {
    let id: OnboardingSectionID
    let slides: [OnboardingSlide]
}

enum OnboardingCatalog {
    static let sections: [OnboardingSection] = [
        OnboardingSection(
            id: .welcome,
            slides: [
                OnboardingSlide(
                    id: "welcome-overview",
                    title: "Browser Monitor at a glance",
                    detail: "A short visual tour of protection, analytics, and everyday browser tools.",
                    captureHint: "15–20 second overview: open the popup, show protection enabled, then briefly scroll through the main areas.",
                    mediaName: "welcome-overview"
                )
            ]
        ),
        OnboardingSection(
            id: .browser,
            slides: [
                OnboardingSlide(
                    id: "browser-install",
                    title: "Install the extension",
                    detail: "Add Browser Monitor to Chrome and keep it within easy reach.",
                    captureHint: "Record loading the unpacked extension on chrome://extensions. Hide personal extensions and profile data.",
                    mediaName: "browser-install"
                ),
                OnboardingSlide(
                    id: "browser-pin",
                    title: "Pin Browser Monitor",
                    detail: "Pin the extension so its popup is always one click away.",
                    captureHint: "Record opening Chrome’s Extensions menu and pinning Browser Monitor to the toolbar.",
                    mediaName: "browser-pin"
                ),
                OnboardingSlide(
                    id: "browser-popup",
                    title: "Open the popup",
                    detail: "The popup shows current-site protection and the tools available for the active tab.",
                    captureHint: "Capture a clean popup on a neutral website with no personal tabs visible.",
                    mediaName: "browser-popup"
                )
            ]
        ),
        OnboardingSection(
            id: .blockers,
            slides: [
                OnboardingSlide(
                    id: "blockers-protection",
                    title: "Protection in action",
                    detail: "Ads, trackers, and cryptomining requests are blocked locally.",
                    captureHint: "Record a before/after page load where the blocking counter changes. Avoid copyrighted video content.",
                    mediaName: "blockers-protection"
                ),
                OnboardingSlide(
                    id: "blockers-site-control",
                    title: "Control protection per site",
                    detail: "Pause protection temporarily or add a site exception when a page needs compatibility.",
                    captureHint: "Capture the popup controls for site exception and temporary pause on a test page.",
                    mediaName: "blockers-site-control"
                ),
                OnboardingSlide(
                    id: "blockers-link-safety",
                    title: "Safer link opening",
                    detail: "Suspicious links receive a local warning before navigation continues.",
                    captureHint: "Use the project test page to show the warning screen; do not use a real malicious website.",
                    mediaName: "blockers-link-safety"
                )
            ]
        ),
        OnboardingSection(
            id: .analytics,
            slides: [
                OnboardingSlide(
                    id: "analytics-blocking",
                    title: "Blocking statistics",
                    detail: "See daily totals, a seven-day trend, and the sites where protection helped.",
                    captureHint: "Capture Statistics with seeded demo data, including the chart and top sites.",
                    mediaName: "analytics-blocking"
                ),
                OnboardingSlide(
                    id: "analytics-activity",
                    title: "Tab activity",
                    detail: "Understand active, reading, and video time without sending browsing data away.",
                    captureHint: "Capture Activity with demo domains only. Show the explanation for one active tab.",
                    mediaName: "analytics-activity"
                )
            ]
        ),
        OnboardingSection(
            id: .tools,
            slides: [
                OnboardingSlide(
                    id: "tools-overview",
                    title: "Everyday tools",
                    detail: "Picture-in-Picture, cookie tools, element blocking, and Eco Mode stay close to the active tab.",
                    captureHint: "Record the popup tool row and reorder animation using a neutral test page.",
                    mediaName: "tools-overview"
                ),
                OnboardingSlide(
                    id: "tools-pip",
                    title: "Picture-in-Picture",
                    detail: "Move supported video into a small floating player while you work elsewhere.",
                    captureHint: "Record PiP using a project-owned or royalty-free test video.",
                    mediaName: "tools-pip"
                ),
                OnboardingSlide(
                    id: "tools-element-blocker",
                    title: "Block a page element",
                    detail: "Select a distracting page element and hide it with a reversible custom rule.",
                    captureHint: "Record the element picker on the local test page, including selection and the final result.",
                    mediaName: "tools-element-blocker"
                ),
                OnboardingSlide(
                    id: "tools-settings",
                    title: "Settings by section",
                    detail: "General, filters, page controls, appearance, custom rules, and local data are separated clearly.",
                    captureHint: "Slowly move through every Settings section. Keep the pointer away from text while scrolling.",
                    mediaName: "tools-settings"
                )
            ]
        )
    ]

    static var totalSlideCount: Int {
        sections.reduce(0) { $0 + $1.slides.count }
    }
}
