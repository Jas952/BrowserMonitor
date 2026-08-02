import SwiftUI

private let aboutAccent = Color(red: 0.20, green: 0.45, blue: 0.98)

struct ProjectAboutPane: View {
    @StateObject private var updateService = UpdateService.shared
    private let repositoryURL = URL(string: "https://github.com/Jas952/BrowserMonitor")!

    var body: some View {
        VStack(spacing: 14) {
            HStack {
                AppBrandView(
                    detailText: "Version \(updateService.currentVersion)",
                    detailAccessory: AnyView(updateButton)
                )
                Spacer(minLength: 0)
            }

            Divider()

            Link(destination: repositoryURL) {
                HStack(spacing: 11) {
                    GitHubMarkView()
                        .frame(width: 28, height: 28)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Browser Monitor on GitHub")
                            .font(.headline)
                            .foregroundStyle(.primary)
                        Text("Jas952 / BrowserMonitor")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .foregroundStyle(.secondary)
                }
                .padding(11)
                .background(Color.secondary.opacity(0.07), in: RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)

            StarInstructionCard(repositoryURL: repositoryURL)
        }
        .padding(20)
        .alert("No updates available", isPresented: noticeIsPresented) {
            Button("OK") {
                updateService.dismissNotice()
            }
        }
    }

    private var noticeIsPresented: Binding<Bool> {
        Binding(
            get: { updateService.notice != nil },
            set: { isPresented in
                if !isPresented {
                    updateService.dismissNotice()
                }
            }
        )
    }

    @ViewBuilder
    private var updateButton: some View {
        Button {
            updateService.checkForUpdates()
        } label: {
            if updateService.status == .checking {
                ProgressView()
                    .controlSize(.mini)
                    .frame(width: 14, height: 14)
            } else {
                Image(systemName: updateService.status.symbolName)
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(updateStatusColor)
            }
        }
        .buttonStyle(.borderless)
        .disabled(!updateService.canCheckForUpdates || updateService.status == .checking)
        .help(updateService.status.detailText)
        .accessibilityLabel("Check for Browser Monitor updates")
        .accessibilityValue(updateService.status.detailText)
    }

    private var updateStatusColor: Color {
        switch updateService.status {
        case .available: .accentColor
        case .failed: .orange
        case .upToDate, .installed: .green
        case .idle, .checking: .secondary
        }
    }
}

private struct GitHubMarkView: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        BundledImageView(name: colorScheme == .dark ? "github-mark-white" : "github-mark")
            .scaledToFit()
            .accessibilityLabel("GitHub")
    }
}

private struct StarInstructionCard: View {
    let repositoryURL: URL

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(spacing: 7) {
                Image(systemName: "star.fill")
                    .foregroundStyle(.yellow)
                Text("Support the project")
                    .font(.headline)
            }

            GitHubStarLocationDiagram()

            Text("Open the repository and click **Star** in its upper-right area. It helps other people discover Browser Monitor.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            Link("Open repository", destination: repositoryURL)
                .font(.caption.weight(.semibold))
        }
        .padding(12)
        .background(
            LinearGradient(
                colors: [
                    aboutAccent.opacity(0.08),
                    Color.purple.opacity(0.045)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 14)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(aboutAccent.opacity(0.16))
        }
    }
}

private struct GitHubStarLocationDiagram: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color(nsColor: .controlBackgroundColor).opacity(0.78))

            VStack(spacing: 0) {
                HStack(spacing: 8) {
                    FadedGitHubControl(symbol: "pin", width: 48)
                    FadedGitHubControl(symbol: "eye", width: 66)
                    FadedGitHubControl(symbol: "arrow.triangle.branch", width: 58)
                    Spacer()
                    GitHubStarControl()
                }
                .padding(10)
                .background(Color.secondary.opacity(0.04))

                Divider()

                HStack(alignment: .top, spacing: 10) {
                    VStack(alignment: .leading, spacing: 7) {
                        Capsule()
                            .frame(width: 112, height: 7)
                        Capsule()
                            .frame(width: 166, height: 6)
                        Capsule()
                            .frame(width: 136, height: 6)
                    }
                    Spacer()

                    RoundedRectangle(cornerRadius: 6)
                        .frame(width: 82, height: 32)
                }
                .padding(.horizontal, 12)
                .padding(.top, 12)
                .foregroundStyle(Color.secondary.opacity(0.12))
            }

        }
        .frame(height: 112)
        .overlay {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.secondary.opacity(0.12))
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("GitHub repository preview. The Star button is in the upper-right area.")
    }
}

private struct GitHubStarControl: View {
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "star")
            Text("Star")
            Text("0")
                .padding(.horizontal, 5)
                .padding(.vertical, 2)
                .background(Color.secondary.opacity(0.12), in: Capsule())
            Divider()
                .frame(height: 18)
            Image(systemName: "chevron.down")
                .font(.system(size: 7, weight: .bold))
        }
        .font(.system(size: 10, weight: .semibold))
        .padding(.horizontal, 8)
        .frame(height: 28)
        .background(.background, in: RoundedRectangle(cornerRadius: 7))
        .overlay {
            RoundedRectangle(cornerRadius: 7)
                .stroke(aboutAccent, lineWidth: 2)
        }
        .shadow(color: aboutAccent.opacity(0.25), radius: 8)
    }
}

private struct FadedGitHubControl: View {
    let symbol: String
    let width: CGFloat

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: symbol)
            Capsule()
                .frame(width: width - 25, height: 5)
        }
        .font(.system(size: 10))
        .foregroundStyle(Color.secondary.opacity(0.23))
        .frame(width: width, height: 28)
        .background(Color.secondary.opacity(0.045), in: RoundedRectangle(cornerRadius: 7))
        .overlay {
            RoundedRectangle(cornerRadius: 7)
                .stroke(Color.secondary.opacity(0.12))
        }
    }
}
