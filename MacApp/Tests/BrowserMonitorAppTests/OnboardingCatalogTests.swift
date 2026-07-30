import XCTest
@testable import BrowserMonitorApp

final class OnboardingCatalogTests: XCTestCase {
    func testSectionsKeepTheReferenceOrder() {
        XCTAssertEqual(
            OnboardingCatalog.sections.map(\.id.rawValue),
            ["Welcome", "Browser", "Blockers", "Analytics", "Tools"]
        )
    }

    func testSlidesHaveUniqueMediaSlots() {
        let slides = OnboardingCatalog.sections.flatMap(\.slides)
        let mediaNames = slides.map(\.mediaName)

        XCTAssertEqual(slides.count, 13)
        XCTAssertEqual(Set(mediaNames).count, mediaNames.count)
        XCTAssertTrue(slides.allSatisfy { !$0.captureHint.isEmpty })
    }
}
