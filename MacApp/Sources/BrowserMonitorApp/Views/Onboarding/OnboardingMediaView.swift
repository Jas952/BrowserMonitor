import AVKit
import AppKit
import SwiftUI

struct OnboardingMediaView: View {
    let section: OnboardingSectionID
    let slide: OnboardingSlide

    var body: some View {
        Group {
            switch OnboardingMediaResolver.asset(named: slide.mediaName) {
            case .image(let url):
                if let image = NSImage(contentsOf: url) {
                    Image(nsImage: image)
                        .resizable()
                        .scaledToFit()
                        .background(.black.opacity(0.02))
                        .tutorialMediaSurface()
                }
            case .video(let url):
                LoopingTutorialVideo(url: url)
                    .tutorialMediaSurface()
            case nil:
                TutorialMediaPlaceholder(section: section, slide: slide)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private extension View {
    func tutorialMediaSurface() -> some View {
        clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Color.white.opacity(0.9), lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.14), radius: 22, y: 11)
    }
}

private final class TutorialVideoController: ObservableObject {
    let player: AVQueuePlayer
    private var looper: AVPlayerLooper?

    init(url: URL) {
        let player = AVQueuePlayer()
        let item = AVPlayerItem(url: url)
        self.player = player
        looper = AVPlayerLooper(player: player, templateItem: item)
        player.isMuted = true
        player.play()
    }

    deinit {
        player.pause()
    }
}

private struct LoopingTutorialVideo: View {
    @StateObject private var controller: TutorialVideoController

    init(url: URL) {
        _controller = StateObject(wrappedValue: TutorialVideoController(url: url))
    }

    var body: some View {
        VideoPlayer(player: controller.player)
            .background(.black)
            .onAppear { controller.player.play() }
            .onDisappear { controller.player.pause() }
    }
}

private struct TutorialMediaPlaceholder: View {
    let section: OnboardingSectionID
    let slide: OnboardingSlide

    var body: some View {
        ZStack {
            BrowserFramePlaceholder(section: section)
                .aspectRatio(1.63, contentMode: .fit)
                .shadow(color: .black.opacity(0.14), radius: 22, y: 11)

            VStack {
                Spacer()
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "video.badge.plus")
                        .foregroundStyle(Color.onboardingAccent)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Media slot: \(slide.mediaName)")
                            .font(.caption.monospaced().weight(.semibold))
                        Text(slide.captureHint)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                .padding(.horizontal, 11)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial, in: Capsule())
                .padding(14)
            }
        }
    }
}

private struct BrowserFramePlaceholder: View {
    let section: OnboardingSectionID

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 7) {
                Circle().fill(.red.opacity(0.75)).frame(width: 11, height: 11)
                Circle().fill(.yellow.opacity(0.75)).frame(width: 11, height: 11)
                Circle().fill(.green.opacity(0.75)).frame(width: 11, height: 11)
                RoundedRectangle(cornerRadius: 7)
                    .fill(Color.black.opacity(0.05))
                    .frame(height: 28)
                    .padding(.leading, 12)
            }
            .padding(13)
            .background(Color.black.opacity(0.035))

            ZStack {
                LinearGradient(
                    colors: [Color.onboardingAccent.opacity(0.07), .white],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                VStack(spacing: 14) {
                    Image(systemName: section.symbol)
                        .font(.system(size: 52, weight: .medium))
                        .foregroundStyle(Color.onboardingAccent)
                    Text(section.rawValue)
                        .font(.title.bold())
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 58))
                        .foregroundStyle(.black.opacity(0.62))
                }
            }
        }
        .background(.white, in: RoundedRectangle(cornerRadius: 17))
        .clipShape(RoundedRectangle(cornerRadius: 17))
        .overlay {
            RoundedRectangle(cornerRadius: 17)
                .stroke(Color.black.opacity(0.1))
        }
    }
}
