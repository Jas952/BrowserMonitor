import AppKit
import Foundation

enum ChromeIntegration {
    static let bundleIdentifier = "com.google.Chrome"

    static var applicationURL: URL? {
        NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleIdentifier)
    }

    static var icon: NSImage? {
        guard let applicationURL else { return nil }
        return NSWorkspace.shared.icon(forFile: applicationURL.path)
    }

    static var isInstalled: Bool {
        applicationURL != nil
    }

    static func openExtensionsPage() {
        guard let applicationURL,
              let extensionsURL = URL(string: "chrome://extensions") else {
            if let downloadURL = URL(string: "https://www.google.com/chrome/") {
                NSWorkspace.shared.open(downloadURL)
            }
            return
        }

        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = true
        NSWorkspace.shared.open(
            [extensionsURL],
            withApplicationAt: applicationURL,
            configuration: configuration
        )
    }
}
