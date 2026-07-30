import Foundation
import XCTest
@testable import BrowserMonitorApp

final class ReleaseInfoTests: XCTestCase {
    func testDecodesLatestReleaseAndSelectsZip() throws {
        let data = Data(
            """
            {
              "tag_name": "v1.2.3",
              "name": "Browser Monitor 1.2.3",
              "html_url": "https://github.com/Jas952/BrowserMonitor/releases/tag/v1.2.3",
              "assets": [
                {
                  "name": "SHA256SUMS.txt",
                  "browser_download_url": "https://example.com/SHA256SUMS.txt",
                  "size": 90
                },
                {
                  "name": "browser-monitor-1.2.3.zip",
                  "browser_download_url": "https://example.com/browser-monitor.zip",
                  "size": 700000
                }
              ]
            }
            """.utf8
        )

        let release = try JSONDecoder().decode(ReleaseInfo.self, from: data)

        XCTAssertEqual(release.displayVersion, "1.2.3")
        XCTAssertEqual(release.zipAsset?.name, "browser-monitor-1.2.3.zip")
    }

    func testReleaseWithoutZipHasNoInstallAsset() throws {
        let release = ReleaseInfo(
            tagName: "v1.0.0",
            name: "Browser Monitor 1.0.0",
            pageURL: URL(string: "https://example.com/release")!,
            assets: [
                .init(
                    name: "SHA256SUMS.txt",
                    downloadURL: URL(string: "https://example.com/checksum")!,
                    size: 90
                )
            ]
        )

        XCTAssertNil(release.zipAsset)
    }
}
