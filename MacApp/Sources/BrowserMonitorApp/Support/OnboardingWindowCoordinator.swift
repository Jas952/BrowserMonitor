import AppKit
import SwiftUI

@MainActor
final class OnboardingWindowCoordinator {
    static let shared = OnboardingWindowCoordinator()

    private var window: FullscreenOnboardingWindow?
    private var hiddenWindows: [NSWindow] = []
    private var previousPresentationOptions: NSApplication.PresentationOptions = []

    private init() {}

    func present(onComplete: @escaping @MainActor () -> Void) {
        if let window {
            window.makeKeyAndOrderFront(nil)
            return
        }

        let screen = NSApp.keyWindow?.screen ?? NSScreen.main
        guard let screen else { return }

        hiddenWindows = NSApp.windows.filter { $0.isVisible }
        hiddenWindows.forEach { $0.orderOut(nil) }

        previousPresentationOptions = NSApp.presentationOptions
        NSApp.presentationOptions = [.hideDock, .hideMenuBar]

        let onboardingWindow = FullscreenOnboardingWindow(
            contentRect: screen.frame,
            styleMask: [.borderless],
            backing: .buffered,
            defer: false,
            screen: screen
        )
        onboardingWindow.title = "Знакомство с Browser Monitor"
        onboardingWindow.level = NSWindow.Level(rawValue: NSWindow.Level.mainMenu.rawValue + 1)
        onboardingWindow.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]
        onboardingWindow.backgroundColor = .black
        onboardingWindow.isOpaque = true
        onboardingWindow.hasShadow = false
        onboardingWindow.hidesOnDeactivate = true
        onboardingWindow.contentView = NSHostingView(
            rootView: OnboardingView { [weak self] in
                onComplete()
                self?.dismiss()
            }
        )
        onboardingWindow.setFrame(screen.frame, display: true)

        window = onboardingWindow
        onboardingWindow.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func dismiss() {
        window?.orderOut(nil)
        window?.close()
        window = nil
        NSApp.presentationOptions = previousPresentationOptions

        let windowsToRestore = hiddenWindows
        hiddenWindows.removeAll()
        windowsToRestore.forEach { $0.makeKeyAndOrderFront(nil) }
        NSApp.activate(ignoringOtherApps: true)
    }
}

private final class FullscreenOnboardingWindow: NSWindow {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}
