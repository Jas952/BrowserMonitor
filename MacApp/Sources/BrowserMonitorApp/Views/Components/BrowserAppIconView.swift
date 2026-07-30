import AppKit
import SwiftUI

struct BrowserAppIconView: View {
    let bundleIdentifier: String
    let fallbackSymbol: String
    var fallbackAsset: String? = nil
    let size: CGFloat

    var body: some View {
        Group {
            if let applicationURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleIdentifier) {
                Image(nsImage: NSWorkspace.shared.icon(forFile: applicationURL.path))
                    .resizable()
                    .scaledToFit()
            } else if let fallbackAsset {
                BundledImageView(name: fallbackAsset)
                    .scaledToFit()
            } else {
                RoundedRectangle(cornerRadius: size * 0.22, style: .continuous)
                    .fill(.quaternary)
                    .overlay {
                        Image(systemName: fallbackSymbol)
                            .font(.system(size: size * 0.44, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
            }
        }
        .frame(width: size, height: size)
    }
}
