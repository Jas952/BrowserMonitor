import SwiftUI

struct SettingsView: View {
    var body: some View {
        TabView {
            GeneralSettingsPane()
                .tabItem {
                    Label("General", systemImage: "switch.2")
                }

            ProjectAboutPane()
                .tabItem {
                    Label("About", systemImage: "info.circle")
                }
        }
        .frame(width: 510, height: 400)
        .navigationTitle("Browser Monitor Settings")
    }
}
