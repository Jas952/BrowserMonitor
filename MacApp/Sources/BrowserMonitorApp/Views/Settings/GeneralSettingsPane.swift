import AppKit
import SwiftUI

struct GeneralSettingsPane: View {
    @AppStorage("automaticallyRevealDownload") private var automaticallyRevealDownload = true

    var body: some View {
        Form {
            Section("Installation") {
                Toggle("Reveal downloaded ZIP in Finder", isOn: $automaticallyRevealDownload)
                Text("ZIP files are saved to the standard Downloads folder.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section("Releases") {
                Link(
                    "Open latest GitHub Release",
                    destination: URL(string: "https://github.com/Jas952/BrowserMonitor/releases/latest")!
                )
            }
        }
        .formStyle(.grouped)
        .padding(.top, 4)
    }
}
