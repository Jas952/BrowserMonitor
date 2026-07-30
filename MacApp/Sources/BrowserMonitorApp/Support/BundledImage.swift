import AppKit
import SwiftUI

enum BundledImage {
    static func named(_ name: String, extension extensionName: String = "png") -> NSImage? {
        guard let url = Bundle.module.url(forResource: name, withExtension: extensionName) else {
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
