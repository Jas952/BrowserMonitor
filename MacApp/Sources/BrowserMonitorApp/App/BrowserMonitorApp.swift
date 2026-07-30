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
        .commands {
            CommandGroup(after: .appSettings) {
                Divider()
                Button {
                    appState.presentOnboarding()
                } label: {
                    Label("Replay Intro", systemImage: "arrow.counterclockwise")
                }
                .keyboardShortcut("i", modifiers: [.command, .shift])
            }
        }

        Settings {
            SettingsView()
                .environmentObject(appState)
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
        DispatchQueue.main.async {
            AppState.shared.presentInitialOnboardingIfNeeded()
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}
