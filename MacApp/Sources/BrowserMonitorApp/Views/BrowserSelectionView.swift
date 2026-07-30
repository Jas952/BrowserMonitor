import AppKit
import SwiftUI

private let companionBlue = Color(red: 0.18, green: 0.43, blue: 0.96)

private enum DesktopPlatform: String, Hashable {
    case macOS
    case windows = "Windows"
}

struct BrowserSelectionView: View {
    @EnvironmentObject private var appState: AppState
    @ObservedObject var downloadManager: ReleaseDownloadManager

    @State private var showsInstallChoices = false
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
                appState.presentOnboarding()
            } label: {
                Label("Replay Intro", systemImage: "arrow.counterclockwise")
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
                BrowserChoiceCard(
                    title: "Chrome",
                    bundleIdentifier: "com.google.Chrome",
                    fallbackSymbol: "globe",
                    platforms: [.macOS, .windows],
                    isSelected: true,
                    isAvailable: true
                ) {
                    showsInstallChoices.toggle()
                }
                .background {
                    AnchoredPanelPresenter(
                        isPresented: $showsInstallChoices,
                        panelSize: CGSize(width: 224, height: 108)
                    ) {
                        InstallChoicePanel(
                            downloadManager: downloadManager,
                            isDownloading: $isDownloading,
                            message: $message,
                            dismiss: { showsInstallChoices = false }
                        )
                        .preferredColorScheme(.light)
                    }
                }

                BrowserChoiceCard(
                    title: "Edge",
                    bundleIdentifier: "com.microsoft.edgemac",
                    fallbackSymbol: "wave.3.right",
                    fallbackAsset: "edge",
                    platforms: [.macOS, .windows],
                    isSelected: false,
                    isAvailable: false,
                    action: {}
                )

                BrowserChoiceCard(
                    title: "Safari",
                    bundleIdentifier: "com.apple.Safari",
                    fallbackSymbol: "safari",
                    platforms: [.macOS],
                    isSelected: false,
                    isAvailable: false,
                    action: {}
                )
            }
            .padding(.top, 18)
        }
        .padding(.top, 18)
        .padding(.bottom, 18)
        .frame(maxHeight: .infinity, alignment: .top)
    }
}

private struct BrowserChoiceCard: View {
    let title: String
    let bundleIdentifier: String
    let fallbackSymbol: String
    var fallbackAsset: String? = nil
    let platforms: [DesktopPlatform]
    let isSelected: Bool
    let isAvailable: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 10) {
                BrowserAppIconView(
                    bundleIdentifier: bundleIdentifier,
                    fallbackSymbol: fallbackSymbol,
                    fallbackAsset: fallbackAsset,
                    size: 58
                )

                Text(title)
                    .font(.body.weight(.medium))
                    .foregroundStyle(isAvailable ? .primary : .secondary)

                PlatformBadgeRow(platforms: platforms)
            }
            .frame(width: 142, height: 152)
            .contentShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .background(
            Color(nsColor: .controlBackgroundColor).opacity(isAvailable ? 0.9 : 0.62),
            in: RoundedRectangle(cornerRadius: 16)
        )
        .overlay(alignment: .topTrailing) {
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title2)
                    .symbolRenderingMode(.palette)
                    .foregroundStyle(.white, companionBlue)
                    .offset(x: 10, y: -10)
            }
        }
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    isSelected ? companionBlue : Color.secondary.opacity(0.16),
                    lineWidth: isSelected ? 2 : 1
                )
        }
        .shadow(color: isSelected ? companionBlue.opacity(0.10) : .clear, radius: 12, y: 5)
        .disabled(!isAvailable)
        .help(isAvailable ? "Choose \(title)" : "\(title) support is planned")
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
    @ObservedObject var downloadManager: ReleaseDownloadManager
    @Binding var isDownloading: Bool
    @Binding var message: String?
    let dismiss: () -> Void

    var body: some View {
        ZStack(alignment: .top) {
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .fill(Color(nsColor: .windowBackgroundColor))
                .padding(.top, 6)
                .shadow(color: .black.opacity(0.16), radius: 15, y: 8)

            Rectangle()
                .fill(Color(nsColor: .windowBackgroundColor))
                .frame(width: 14, height: 14)
                .rotationEffect(.degrees(45))
                .offset(y: 1)

            VStack(spacing: 0) {
                InstallMenuItem(title: "Open Web Store", symbol: "bag") {
                    if let storeURL = BrowserOption.chrome.storeURL {
                        NSWorkspace.shared.open(storeURL)
                        dismiss()
                    } else {
                        dismiss()
                        message = "The official Browser Monitor page in Chrome Web Store has not been published yet."
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
                        await downloadManager.downloadLatest()
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
        .overlay {
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .stroke(Color.secondary.opacity(0.16))
                .padding(.top, 6)
        }
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
