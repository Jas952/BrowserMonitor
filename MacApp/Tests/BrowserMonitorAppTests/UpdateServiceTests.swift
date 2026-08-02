import XCTest
@testable import BrowserMonitorApp

final class UpdateServiceTests: XCTestCase {
    func testNumericVersionComparison() {
        XCTAssertEqual(UpdateService.compareVersions("1.10.0", "1.9.9"), .orderedDescending)
        XCTAssertEqual(UpdateService.compareVersions("1.2.0", "1.2"), .orderedDescending)
        XCTAssertEqual(UpdateService.compareVersions("1.2.0", "1.2.1"), .orderedAscending)
    }

    func testGenuineNoUpdateCompletionReportsUpToDate() {
        let presentation = UpdateService.presentation(for: .noUpdate)

        XCTAssertEqual(presentation.status, .upToDate)
        XCTAssertEqual(presentation.notice.title, "No updates available")
        XCTAssertEqual(presentation.notice.message, "Browser Monitor is up to date.")
    }

    func testMissingFeedURLReportsFailure() {
        XCTAssertThrowsError(try UpdateService.feedURL(from: nil)) { error in
            assertUnableToCheck(UpdateService.failureCompletion(for: error))
        }
    }

    func testTimeoutAndTransportErrorsReportFailure() {
        for code in [URLError.timedOut, .notConnectedToInternet] {
            assertUnableToCheck(UpdateService.failureCompletion(for: URLError(code)))
        }
    }

    func testNonSuccessHTTPStatusReportsFailure() throws {
        let response = try XCTUnwrap(
            HTTPURLResponse(
                url: URL(string: "https://example.com/appcast.xml")!,
                statusCode: 503,
                httpVersion: nil,
                headerFields: nil
            )
        )

        XCTAssertThrowsError(try UpdateService.validateFeedResponse(response)) { error in
            assertUnableToCheck(UpdateService.failureCompletion(for: error))
        }
    }

    private func assertUnableToCheck(
        _ completion: UpdateService.ManualCheckCompletion,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        let presentation = UpdateService.presentation(for: completion)
        guard case .failed(let message) = presentation.status else {
            return XCTFail("Expected a failed update status", file: file, line: line)
        }
        XCTAssertTrue(message.hasPrefix("Unable to check for updates."), file: file, line: line)
        XCTAssertEqual(presentation.notice.title, "Unable to check for updates", file: file, line: line)
        XCTAssertFalse(presentation.notice.message.isEmpty, file: file, line: line)
        XCTAssertTrue(message.hasSuffix(presentation.notice.message), file: file, line: line)
    }
}
