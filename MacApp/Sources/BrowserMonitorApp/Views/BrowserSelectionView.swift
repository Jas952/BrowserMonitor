import AppKit
import SwiftUI

private let companionBlue = Color(red: 0.18, green: 0.43, blue: 0.96)

struct BrowserSelectionView: View {
    @Environment(\.openWindow) private var openWindow
    @ObservedObject var downloadManager: ReleaseDownloadManager

    @State private var showsInstallChoices = false
    @State private var selectedBrowserID = BrowserOption.chrome.id
    @State private var message: String?
    @State private var isDownloading = false

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            browserChooser
        }
        .frame(width: 620, height: 320)
        .background(Color(nsColor: .windowBackgroundColor))
        .preferredColorScheme(.light)
        .alert(
            "Installation unavailable",
            isPresented: Binding(
                get: { message != nil },
                set: { if !$0 { message = nil } }
            )
        ) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(message ?? "")
        }
    }

    private var header: some View {
        HStack(spacing: 14) {
            Spacer()

            Button {
                openWindow(id: "extension-info")
            } label: {
                Label("Info", systemImage: "info.circle")
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)

            Divider()
                .frame(height: 18)

            SettingsLink {
                Label("Settings", systemImage: "gearshape")
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
        }
        .font(.callout.weight(.medium))
        .padding(.horizontal, 20)
        .frame(height: 48)
    }

    private var browserChooser: some View {
        VStack(spacing: 0) {
            Text("Choose Browser")
                .font(.title2.bold())

            Text("Select the browser you’d like to add the extension to.")
                .font(.callout)
                .foregroundStyle(.secondary)
                .padding(.top, 4)

            HStack(alignment: .top, spacing: 16) {
                ForEach(BrowserOption.catalog) { browser in
                    BrowserChoiceCard(
                        browser: browser,
                        isSelected: selectedBrowserID == browser.id
                    ) {
                        if selectedBrowserID == browser.id {
                            showsInstallChoices.toggle()
                        } else {
                            selectedBrowserID = browser.id
                            showsInstallChoices = true
                        }
                    }
                    .background {
                        if browser.isAvailable {
                            AnchoredPanelPresenter(
                                isPresented: installPanelBinding(for: browser),
                                panelSize: CGSize(width: 224, height: 108)
                            ) {
                                InstallChoicePanel(
                                    browser: browser,
                                    downloadManager: downloadManager,
                                    isDownloading: $isDownloading,
                                    message: $message,
                                    dismiss: { showsInstallChoices = false }
                                )
                                .preferredColorScheme(.light)
                            }
                        }
                    }
                }
            }
            .padding(.top, 18)
        }
        .padding(.top, 18)
        .padding(.bottom, 18)
        .frame(maxHeight: .infinity, alignment: .top)
    }

    private func installPanelBinding(for browser: BrowserOption) -> Binding<Bool> {
        Binding(
            get: { showsInstallChoices && selectedBrowserID == browser.id },
            set: { isPresented in
                if !isPresented, selectedBrowserID == browser.id {
                    showsInstallChoices = false
                }
            }
        )
    }
}

private struct BrowserChoiceCard: View {
    let browser: BrowserOption
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 10) {
                BrowserAppIconView(
                    bundleIdentifier: browser.bundleIdentifier,
                    fallbackSymbol: browser.fallbackSymbol,
                    fallbackAsset: browser.fallbackAsset,
                    size: 58
                )

                Text(browser.name)
                    .font(.body.weight(.medium))
                    .foregroundStyle(browser.isAvailable ? .primary : .secondary)

                PlatformBadgeRow(platforms: browser.platforms)
            }
            .frame(width: 142, height: 152)
            .contentShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .background(
            Color(nsColor: .controlBackgroundColor).opacity(browser.isAvailable ? 0.9 : 0.62),
            in: RoundedRectangle(cornerRadius: 16)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    isSelected ? companionBlue : Color.secondary.opacity(0.16),
                    lineWidth: isSelected ? 2 : 1
                )
        }
        .overlay(alignment: .topTrailing) {
            if isSelected {
                SelectionCornerBadge()
            }
        }
        .shadow(color: isSelected ? companionBlue.opacity(0.10) : .clear, radius: 12, y: 5)
        .disabled(!browser.isAvailable)
        .help(browser.isAvailable ? "Choose \(browser.name)" : "\(browser.name) support is planned")
    }
}

private struct SelectionCornerBadge: View {
    var body: some View {
        Image(systemName: "checkmark")
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 36, height: 32)
            .background(
                companionBlue,
                in: UnevenRoundedRectangle(
                    topLeadingRadius: 0,
                    bottomLeadingRadius: 14,
                    bottomTrailingRadius: 0,
                    topTrailingRadius: 15,
                    style: .continuous
                )
            )
            .accessibilityHidden(true)
    }
}

private struct PlatformBadgeRow: View {
    let platforms: [DesktopPlatform]

    var body: some View {
        HStack(spacing: 5) {
            ForEach(platforms, id: \.self) { platform in
                HStack(spacing: 3) {
                    switch platform {
                    case .macOS:
                        Image(systemName: "apple.logo")
                            .font(.system(size: 8, weight: .semibold))
                    case .windows:
                        WindowsMark()
                            .frame(width: 9, height: 9)
                    }

                    Text(platform.rawValue)
                        .font(.system(size: 8, weight: .semibold))
                }
                .foregroundStyle(.secondary)
                .padding(.horizontal, 6)
                .padding(.vertical, 4)
                .background(Color.secondary.opacity(0.08), in: Capsule())
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Available on \(platforms.map(\.rawValue).joined(separator: " and "))")
    }
}

private struct WindowsMark: View {
    var body: some View {
        Grid(horizontalSpacing: 1, verticalSpacing: 1) {
            GridRow {
                Rectangle()
                Rectangle()
            }
            GridRow {
                Rectangle()
                Rectangle()
            }
        }
        .foregroundStyle(.secondary)
        .accessibilityHidden(true)
    }
}

private struct InstallChoicePanel: View {
    let browser: BrowserOption
    @ObservedObject var downloadManager: ReleaseDownloadManager
    @Binding var isDownloading: Bool
    @Binding var message: String?
    let dismiss: () -> Void

    var body: some View {
        ZStack {
            InstallPanelShape()
                .fill(Color(nsColor: .windowBackgroundColor))

            InstallPanelTopOutline()
                .stroke(
                    LinearGradient(
                        colors: [
                            companionBlue.opacity(0),
                            companionBlue.opacity(0.20),
                            Color.secondary.opacity(0.34),
                            companionBlue.opacity(0.20),
                            companionBlue.opacity(0)
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    ),
                    style: StrokeStyle(lineWidth: 1.2, lineCap: .round, lineJoin: .round)
                )

            VStack(spacing: 0) {
                InstallMenuItem(title: "Open Web Store", symbol: "bag") {
                    if let storeURL = browser.storeURL {
                        NSWorkspace.shared.open(storeURL)
                        dismiss()
                    } else {
                        dismiss()
                        message = "The official Browser Monitor page in \(browser.storeName) has not been published yet."
                    }
                }

                Divider()
                    .padding(.horizontal, 10)

                InstallMenuItem(
                    title: isDownloading ? "Downloading…" : "Download ZIP",
                    symbol: "arrow.down.to.line.compact"
                ) {
                    guard !isDownloading else { return }
                    isDownloading = true
                    dismiss()
                    Task {
                        switch browser.archiveSource {
                        case .latestGitHubRelease:
                            await downloadManager.downloadLatest()
                        case .direct(let url, let filename):
                            await downloadManager.downloadArchive(from: url, filename: filename)
                        case .unavailable:
                            message = "A ZIP download is not available for \(browser.name) yet."
                        }
                        isDownloading = false
                        if case .failed(let error) = downloadManager.state {
                            message = error
                        }
                    }
                }
            }
            .padding(.top, 7)
            .padding(7)
        }
        .frame(width: 224, height: 108)
    }
}

private struct InstallPanelShape: Shape {
    func path(in rect: CGRect) -> Path {
        let radius: CGFloat = 13
        let arrowHalfWidth: CGFloat = 8
        let bodyTop: CGFloat = 7
        let middle = rect.midX

        var path = Path()
        path.move(to: CGPoint(x: radius, y: bodyTop))
        path.addLine(to: CGPoint(x: middle - arrowHalfWidth, y: bodyTop))
        path.addLine(to: CGPoint(x: middle, y: 0))
        path.addLine(to: CGPoint(x: middle + arrowHalfWidth, y: bodyTop))
        path.addLine(to: CGPoint(x: rect.maxX - radius, y: bodyTop))
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX, y: bodyTop + radius),
            control: CGPoint(x: rect.maxX, y: bodyTop)
        )
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - radius))
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX - radius, y: rect.maxY),
            control: CGPoint(x: rect.maxX, y: rect.maxY)
        )
        path.addLine(to: CGPoint(x: radius, y: rect.maxY))
        path.addQuadCurve(
            to: CGPoint(x: 0, y: rect.maxY - radius),
            control: CGPoint(x: 0, y: rect.maxY)
        )
        path.addLine(to: CGPoint(x: 0, y: bodyTop + radius))
        path.addQuadCurve(
            to: CGPoint(x: radius, y: bodyTop),
            control: CGPoint(x: 0, y: bodyTop)
        )
        path.closeSubpath()
        return path
    }
}

private struct InstallPanelTopOutline: Shape {
    func path(in rect: CGRect) -> Path {
        let radius: CGFloat = 13
        let arrowHalfWidth: CGFloat = 8
        let bodyTop: CGFloat = 7
        let middle = rect.midX

        var path = Path()
        path.move(to: CGPoint(x: 0, y: bodyTop + radius))
        path.addQuadCurve(
            to: CGPoint(x: radius, y: bodyTop),
            control: CGPoint(x: 0, y: bodyTop)
        )
        path.addLine(to: CGPoint(x: middle - arrowHalfWidth, y: bodyTop))
        path.addLine(to: CGPoint(x: middle, y: 0))
        path.addLine(to: CGPoint(x: middle + arrowHalfWidth, y: bodyTop))
        path.addLine(to: CGPoint(x: rect.maxX - radius, y: bodyTop))
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX, y: bodyTop + radius),
            control: CGPoint(x: rect.maxX, y: bodyTop)
        )
        return path
    }
}

private struct InstallMenuItem: View {
    let title: String
    let symbol: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: symbol)
                    .font(.title3)
                    .frame(width: 26)
                Text(title)
                    .font(.body.weight(.medium))
                Spacer()
            }
            .padding(.horizontal, 10)
            .frame(height: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
