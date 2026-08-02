import Foundation

enum DesktopPlatform: String, Hashable {
    case macOS = "macOS"
    case windows = "Windows"
}

struct BrowserOption: Identifiable, Equatable {
    let id: String
    let name: String
    let bundleIdentifier: String
    let fallbackSymbol: String
    let fallbackAsset: String?
    let platforms: [DesktopPlatform]
    let storeName: String
    let storeURL: URL?
    let archiveSource: ArchiveSource
    let availability: Availability

    enum Availability: Equatable {
        case available
        case planned
    }

    enum ArchiveSource: Equatable {
        /// Uses the first ZIP attached to the latest Browser Monitor GitHub Release.
        case latestGitHubRelease

        /// Downloads a fixed ZIP URL. Supply a filename only when the URL does not contain one.
        case direct(URL, filename: String? = nil)

        case unavailable
    }

    var isAvailable: Bool {
        availability == .available
    }

    /// Browser installation catalog.
    ///
    /// To publish another browser, edit its entry here: paste its official store URL,
    /// choose `.latestGitHubRelease` or `.direct(...)` for the ZIP, then change
    /// `availability` to `.available`. The browser picker needs no other code changes.
    static let catalog: [BrowserOption] = [chrome, edge, safari]

    static let chrome = BrowserOption(
        id: "chrome",
        name: "Chrome",
        bundleIdentifier: "com.google.Chrome",
        fallbackSymbol: "globe",
        fallbackAsset: nil,
        platforms: [.macOS, .windows],
        storeName: "Chrome Web Store",
        // Paste the official published listing URL here.
        storeURL: nil,
        archiveSource: .latestGitHubRelease,
        availability: .available
    )

    static let edge = BrowserOption(
        id: "edge",
        name: "Edge",
        bundleIdentifier: "com.microsoft.edgemac",
        fallbackSymbol: "wave.3.right",
        fallbackAsset: "edge",
        platforms: [.macOS, .windows],
        storeName: "Microsoft Edge Add-ons",
        // Paste the official published listing URL here.
        storeURL: nil,
        // Example: .direct(URL(string: "https://example.com/browser-monitor-edge.zip")!)
        archiveSource: .unavailable,
        availability: .planned
    )

    static let safari = BrowserOption(
        id: "safari",
        name: "Safari",
        bundleIdentifier: "com.apple.Safari",
        fallbackSymbol: "safari",
        fallbackAsset: nil,
        platforms: [.macOS],
        storeName: "App Store",
        // Paste the official published listing URL here.
        storeURL: nil,
        archiveSource: .unavailable,
        availability: .planned
    )
}
