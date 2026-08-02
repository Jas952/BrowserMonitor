import AppKit
import SwiftUI

@main
struct BrowserMonitorApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var appState = AppState.shared

    var body: some Scene {
        WindowGroup("Choose Your Browser", id: "main") {
            ContentView()
                .environmentObject(appState)
        }
        .defaultSize(width: 620, height: 350)
        .windowResizability(.contentSize)

        Window("About Browser Monitor", id: "extension-info") {
            ExtensionInfoView()
        }
        .defaultSize(width: 510, height: 400)
        .windowResizability(.contentSize)

        Settings {
            SettingsView()
                .environmentObject(appState)
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    @MainActor
    func applicationDidFinishLaunching(_ notification: Notification) {
        _ = UpdateService.shared
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}
