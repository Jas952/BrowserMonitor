import XCTest
@testable import BrowserMonitorApp

final class UpdateServiceTests: XCTestCase {
    func testNumericVersionComparison() {
        XCTAssertEqual(UpdateService.compareVersions("1.10.0", "1.9.9"), .orderedDescending)
        XCTAssertEqual(UpdateService.compareVersions("1.2.0", "1.2"), .orderedDescending)
        XCTAssertEqual(UpdateService.compareVersions("1.2.0", "1.2.1"), .orderedAscending)
    }
}
