import SwiftUI

struct AppBrandView: View {
    var compact = false
    var detailText: String? = nil
    var detailAccessory: AnyView? = nil

    var body: some View {
        HStack(spacing: compact ? 10 : 14) {
            BundledImageView(name: "browser-monitor")
                .scaledToFit()
                .frame(width: compact ? 34 : 46, height: compact ? 34 : 46)
                .shadow(color: .black.opacity(0.14), radius: 8, y: 3)

            VStack(alignment: .leading, spacing: compact ? 1 : 3) {
                Text("Browser Monitor")
                    .font(compact ? .headline : .title2.bold())
                Text("COMPANION FOR MAC")
                    .font(.system(size: compact ? 8 : 10, weight: .semibold, design: .rounded))
                    .tracking(1.6)
                    .foregroundStyle(.secondary)

                if let detailText {
                    HStack(spacing: 5) {
                        Text(detailText)
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.secondary)

                        if let detailAccessory {
                            detailAccessory
                        }
                    }
                    .padding(.top, 1)
                }
            }
        }
    }
}
