import Foundation

struct BrowserOption: Identifiable, Equatable {
    let id: String
    let name: String
    let subtitle: String
    let bundleIdentifier: String
    let storeURL: URL?
    let availability: Availability

    enum Availability: Equatable {
        case available
        case planned
    }

    static let chrome = BrowserOption(
        id: "chrome",
        name: "Google Chrome",
        subtitle: "Chrome 120+ · Manifest V3",
        bundleIdentifier: "com.google.Chrome",
        storeURL: nil,
        availability: .available
    )
}
