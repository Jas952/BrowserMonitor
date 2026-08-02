import XCTest
@testable import BrowserMonitorApp

final class BrowserOptionTests: XCTestCase {
    func testCatalogHasStableUniqueIdentifiers() {
        let identifiers = BrowserOption.catalog.map(\.id)

        XCTAssertEqual(identifiers, ["chrome", "edge", "safari"])
        XCTAssertEqual(Set(identifiers).count, identifiers.count)
    }

    func testChromeIsReadyForLatestReleaseInstallation() {
        XCTAssertTrue(BrowserOption.chrome.isAvailable)
        XCTAssertEqual(BrowserOption.chrome.platforms, [.macOS, .windows])
        XCTAssertEqual(BrowserOption.chrome.archiveSource, .latestGitHubRelease)
    }

    func testPlannedBrowsersRemainDisabledUntilTheirLinksAreConfigured() {
        XCTAssertFalse(BrowserOption.edge.isAvailable)
        XCTAssertFalse(BrowserOption.safari.isAvailable)
        XCTAssertEqual(BrowserOption.edge.archiveSource, .unavailable)
        XCTAssertEqual(BrowserOption.safari.archiveSource, .unavailable)
    }
}
