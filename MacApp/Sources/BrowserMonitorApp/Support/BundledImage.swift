import AppKit
import SwiftUI

extension Bundle {
    static var browserMonitorResources: Bundle {
        if let resourcesURL = Bundle.main.resourceURL,
           let bundledResources = Bundle(
               url: resourcesURL.appendingPathComponent("BrowserMonitorApp_BrowserMonitorApp.bundle")
           ) {
            return bundledResources
        }
        return .module
    }
}

enum BundledImage {
    static func named(_ name: String, extension extensionName: String = "png") -> NSImage? {
        guard let url = Bundle.browserMonitorResources.url(forResource: name, withExtension: extensionName) else {
            return nil
        }
        return NSImage(contentsOf: url)
    }
}

struct BundledImageView: View {
    let name: String

    var body: some View {
        Group {
            if let image = BundledImage.named(name) {
                Image(nsImage: image)
                    .resizable()
            } else {
                Color.clear
                    .overlay {
                        Image(systemName: "photo.badge.exclamationmark")
                            .foregroundStyle(.secondary)
                    }
            }
        }
    }
}
