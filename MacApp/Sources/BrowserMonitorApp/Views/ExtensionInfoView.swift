import AppKit
import ImageIO
import SwiftUI

struct ExtensionInfoView: View {
    @State private var selectedSlide: Int

    private let slides = ExtensionInfoSlide.all

    init(initialSlide: Int = 0) {
        _selectedSlide = State(initialValue: initialSlide)
    }

    var body: some View {
        VStack(spacing: 10) {
            slideDescription
            slideMedia
            navigation
            Divider()
            companionNote
        }
        .padding(16)
        .frame(width: 510, height: 400)
    }

    private var slideDescription: some View {
        VStack(spacing: 3) {
            Text(slides[selectedSlide].title)
                .font(.headline)

            Text(slides[selectedSlide].description)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 450)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(height: 43, alignment: .top)
    }

    @ViewBuilder
    private var slideMedia: some View {
        Group {
            if selectedSlide == 0 {
                HStack(spacing: 10) {
                    ScreenshotWindowFrame(backplateWidth: 151, screenshotWidth: 123) {
                        CleanInterfaceImage(
                            name: "extension-overview",
                            crop: CGRect(x: 48.0 / 1280.0, y: 184.0 / 800.0, width: 388.0 / 1280.0, height: 523.0 / 800.0),
                            accessibilityLabel: "Browser Monitor main panel"
                        )
                    }

                    ScreenshotWindowFrame(backplateWidth: 295, screenshotWidth: 243) {
                        CleanInterfaceImage(
                            name: "extension-overview",
                            crop: CGRect(x: 468.0 / 1280.0, y: 184.0 / 800.0, width: 764.0 / 1280.0, height: 523.0 / 800.0),
                            accessibilityLabel: "Browser Monitor local protection analytics"
                        )
                    }
                }
            } else {
                ScreenshotWindowFrame(backplateWidth: 456, screenshotWidth: 241) {
                    CleanInterfaceImage(
                        name: "extension-settings-clean",
                        crop: CGRect(x: 0, y: 0, width: 1, height: 1),
                        accessibilityLabel: "Browser Monitor settings screen"
                    )
                }
            }
        }
        .frame(width: 478, height: 214)
        .id(selectedSlide)
        .transition(.opacity.combined(with: .scale(scale: 0.985)))
    }

    private var navigation: some View {
        HStack {
            Button("Previous", systemImage: "chevron.left") {
                showSlide(selectedSlide - 1)
            }
            .labelStyle(.iconOnly)
            .disabled(selectedSlide == 0)

            Spacer()

            HStack(spacing: 7) {
                ForEach(slides.indices, id: \.self) { index in
                    Button {
                        showSlide(index)
                    } label: {
                        Capsule()
                            .fill(index == selectedSlide ? Color.accentColor : Color.secondary.opacity(0.22))
                            .frame(width: index == selectedSlide ? 22 : 7, height: 7)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Show slide \(index + 1): \(slides[index].title)")
                }
            }

            Spacer()

            Button("Next", systemImage: "chevron.right") {
                showSlide(selectedSlide + 1)
            }
            .labelStyle(.iconOnly)
            .disabled(selectedSlide == slides.count - 1)
        }
        .frame(width: 210, height: 22)
    }

    private var companionNote: some View {
        Label(
            "This app is only a guide. Browser Monitor works in Chrome without it.",
            systemImage: "info.circle"
        )
        .font(.caption)
        .foregroundStyle(.secondary)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func showSlide(_ index: Int) {
        guard slides.indices.contains(index) else { return }
        withAnimation(.easeInOut(duration: 0.22)) {
            selectedSlide = index
        }
    }
}

private struct CleanInterfaceImage: View {
    let name: String
    let crop: CGRect
    let accessibilityLabel: String

    var body: some View {
        Group {
            if let image = croppedImage {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                Image(systemName: "photo.badge.exclamationmark")
                    .foregroundStyle(.secondary)
            }
        }
        .accessibilityLabel(accessibilityLabel)
    }

    private var croppedImage: NSImage? {
        guard
            let url = Bundle.browserMonitorResources.url(forResource: name, withExtension: "png"),
            let imageSource = CGImageSourceCreateWithURL(url as CFURL, nil),
            let cgImage = CGImageSourceCreateImageAtIndex(imageSource, 0, nil)
        else {
            return nil
        }

        let width = CGFloat(cgImage.width)
        let height = CGFloat(cgImage.height)
        let pixelRect = CGRect(
            x: crop.minX * width,
            y: crop.minY * height,
            width: crop.width * width,
            height: crop.height * height
        ).integral

        guard let cropped = cgImage.cropping(to: pixelRect) else { return nil }
        return NSImage(
            cgImage: cropped,
            size: NSSize(width: cropped.width, height: cropped.height)
        )
    }
}

private struct ScreenshotWindowFrame<Content: View>: View {
    let backplateWidth: CGFloat
    let screenshotWidth: CGFloat
    @ViewBuilder let content: Content

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(.regularMaterial)

            VStack(spacing: 0) {
                HStack(spacing: 5) {
                    Circle().fill(.red.opacity(0.88))
                    Circle().fill(.yellow.opacity(0.9))
                    Circle().fill(.green.opacity(0.82))
                }
                .frame(width: 31, height: 7)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 9)
                .frame(height: 22)
                .background(.bar)

                Divider()

                content
                    .frame(width: screenshotWidth, height: 166)
                    .background(Color(nsColor: .controlBackgroundColor).opacity(0.7))
            }
            .frame(width: screenshotWidth)
            .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .stroke(Color(nsColor: .separatorColor).opacity(0.65), lineWidth: 0.75)
            }
            .shadow(color: .black.opacity(0.16), radius: 4, y: 2)
        }
        .frame(width: backplateWidth, height: 204)
        .overlay {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(Color(nsColor: .separatorColor).opacity(0.3), lineWidth: 0.5)
        }
    }
}

private struct ExtensionInfoSlide {
    let title: String
    let description: String

    static let all = [
        ExtensionInfoSlide(
            title: "Protection and tab insights",
            description: "Protection controls and local tab analytics make heavy pages easier to identify."
        ),
        ExtensionInfoSlide(
            title: "Clear, explicit settings",
            description: "Protection, privacy, appearance, rules, and local data stay under your control."
        )
    ]
}
