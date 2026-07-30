import AppKit
import SwiftUI

struct AnchoredPanelPresenter<PanelContent: View>: NSViewRepresentable {
    @Binding var isPresented: Bool
    let panelSize: CGSize
    @ViewBuilder let content: () -> PanelContent

    func makeCoordinator() -> Coordinator {
        Coordinator(
            isPresented: $isPresented,
            panelSize: panelSize,
            content: content
        )
    }

    func makeNSView(context: Context) -> NSView {
        NSView()
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        context.coordinator.update(
            anchorView: nsView,
            isPresented: isPresented,
            binding: $isPresented,
            panelSize: panelSize,
            content: content
        )
    }

    static func dismantleNSView(_ nsView: NSView, coordinator: Coordinator) {
        coordinator.dismiss()
    }

    @MainActor
    final class Coordinator {
        private var isPresented: Binding<Bool>
        private var panelSize: CGSize
        private var content: () -> PanelContent
        private weak var anchorView: NSView?
        private var hostingView: NSHostingView<PanelContent>?
        private var eventMonitor: Any?

        private lazy var panel: NSPanel = {
            let panel = NSPanel(
                contentRect: NSRect(origin: .zero, size: panelSize),
                styleMask: [.borderless, .nonactivatingPanel],
                backing: .buffered,
                defer: false
            )
            panel.isOpaque = false
            panel.backgroundColor = .clear
            panel.hasShadow = false
            panel.isFloatingPanel = true
            panel.hidesOnDeactivate = true
            panel.collectionBehavior = [.transient, .moveToActiveSpace]
            return panel
        }()

        init(
            isPresented: Binding<Bool>,
            panelSize: CGSize,
            content: @escaping () -> PanelContent
        ) {
            self.isPresented = isPresented
            self.panelSize = panelSize
            self.content = content
        }

        func update(
            anchorView: NSView,
            isPresented: Bool,
            binding: Binding<Bool>,
            panelSize: CGSize,
            content: @escaping () -> PanelContent
        ) {
            self.anchorView = anchorView
            self.isPresented = binding
            self.panelSize = panelSize
            self.content = content

            if isPresented {
                show()
            } else {
                dismiss()
            }
        }

        private func show() {
            guard let anchorView, let parentWindow = anchorView.window else {
                DispatchQueue.main.async { [weak self] in self?.show() }
                return
            }

            if let hostingView {
                hostingView.rootView = content()
            } else {
                let hostingView = NSHostingView(rootView: content())
                hostingView.frame = NSRect(origin: .zero, size: panelSize)
                panel.contentView = hostingView
                self.hostingView = hostingView
            }

            panel.setContentSize(panelSize)
            positionPanel(relativeTo: anchorView, in: parentWindow)

            if panel.parent !== parentWindow {
                panel.parent?.removeChildWindow(panel)
                parentWindow.addChildWindow(panel, ordered: .above)
            }
            panel.orderFront(nil)
            installEventMonitor()
        }

        private func positionPanel(relativeTo anchorView: NSView, in window: NSWindow) {
            let anchorInWindow = anchorView.convert(anchorView.bounds, to: nil)
            let anchorOnScreen = window.convertToScreen(anchorInWindow)
            let origin = NSPoint(
                x: anchorOnScreen.midX - panelSize.width / 2,
                y: anchorOnScreen.minY - panelSize.height + 2
            )
            panel.setFrameOrigin(origin)
        }

        private func installEventMonitor() {
            guard eventMonitor == nil else { return }
            eventMonitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown]) { [weak self] event in
                guard let self else { return event }
                let pointer = NSEvent.mouseLocation
                if !panel.frame.contains(pointer), !anchorFrameOnScreen.contains(pointer) {
                    isPresented.wrappedValue = false
                }
                return event
            }
        }

        private var anchorFrameOnScreen: NSRect {
            guard let anchorView, let window = anchorView.window else { return .zero }
            return window.convertToScreen(anchorView.convert(anchorView.bounds, to: nil))
        }

        func dismiss() {
            if let eventMonitor {
                NSEvent.removeMonitor(eventMonitor)
                self.eventMonitor = nil
            }
            panel.parent?.removeChildWindow(panel)
            panel.orderOut(nil)
        }
    }
}
