import AppKit
import SwiftUI

struct ChromeIconView: View {
    let size: CGFloat

    var body: some View {
        Group {
            if let icon = ChromeIntegration.icon {
                Image(nsImage: icon)
                    .resizable()
                    .scaledToFit()
            } else {
                ZStack {
                    Circle()
                        .fill(.quaternary)
                    Image(systemName: "globe")
                        .font(.system(size: size * 0.42, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(width: size, height: size)
        .accessibilityLabel("Google Chrome")
    }
}
