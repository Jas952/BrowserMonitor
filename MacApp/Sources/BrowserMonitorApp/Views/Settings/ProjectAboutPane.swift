import SwiftUI

struct ProjectAboutPane: View {
    private let repositoryURL = URL(string: "https://github.com/Jas952/BrowserMonitor")!

    private var version: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.1.0"
    }

    var body: some View {
        VStack(spacing: 14) {
            VStack(spacing: 7) {
                AppBrandView()
                Text("Version \(version)")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
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
                    Color.onboardingAccent.opacity(0.08),
                    Color.purple.opacity(0.045)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 14)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.onboardingAccent.opacity(0.16))
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
                    Color.clear
                        .frame(width: 102, height: 28)
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

            StarGuideArrow()
                .stroke(
                    Color.onboardingAccent,
                    style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round, dash: [5, 4])
                )
                .shadow(color: Color.onboardingAccent.opacity(0.18), radius: 2)
                .frame(width: 94, height: 46)
                .offset(x: 82, y: 27)

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
                    .stroke(Color.onboardingAccent, lineWidth: 2)
            }
            .shadow(color: Color.onboardingAccent.opacity(0.25), radius: 8)
            .offset(x: 151, y: -31)
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

private struct StarGuideArrow: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.addCurve(
            to: CGPoint(x: rect.maxX - 7, y: rect.minY + 8),
            control1: CGPoint(x: rect.width * 0.54, y: rect.maxY),
            control2: CGPoint(x: rect.width * 0.58, y: rect.minY + 8)
        )
        path.move(to: CGPoint(x: rect.maxX - 16, y: rect.minY + 7))
        path.addLine(to: CGPoint(x: rect.maxX - 7, y: rect.minY + 8))
        path.addLine(to: CGPoint(x: rect.maxX - 10, y: rect.minY + 17))
        return path
    }
}
