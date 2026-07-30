import SwiftUI

extension Color {
    static let onboardingAccent = Color(red: 0.20, green: 0.45, blue: 0.98)
}

struct OnboardingView: View {
    let onFinish: () -> Void

    @State private var sectionIndex = 0
    @State private var slideIndex = 0
    @State private var direction = 1

    private var section: OnboardingSection {
        OnboardingCatalog.sections[sectionIndex]
    }

    private var slide: OnboardingSlide {
        section.slides[slideIndex]
    }

    var body: some View {
        ZStack {
            Color(nsColor: .windowBackgroundColor)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                TutorialHeader(onClose: onFinish)

                HStack(spacing: 18) {
                    TutorialMediaPanel(
                        section: section.id,
                        slide: slide,
                        slideIndex: slideIndex,
                        slideCount: section.slides.count,
                        direction: direction,
                        isAtStart: sectionIndex == 0 && slideIndex == 0,
                        isAtEnd: sectionIndex == OnboardingCatalog.sections.count - 1
                            && slideIndex == section.slides.count - 1,
                        onBack: goBack,
                        onNext: goNext
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                    TutorialStepRail(
                        sections: OnboardingCatalog.sections,
                        selectedIndex: sectionIndex,
                        onSelect: selectSection
                    )
                    .frame(width: 286)
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 10)

                TutorialFooter(
                    sectionIndex: sectionIndex,
                    sectionCount: OnboardingCatalog.sections.count
                )
            }
        }
        .preferredColorScheme(.light)
    }

    private func selectSection(_ index: Int) {
        direction = index >= sectionIndex ? 1 : -1
        withAnimation(.smooth(duration: 0.4)) {
            sectionIndex = index
            slideIndex = 0
        }
    }

    private func goNext() {
        if slideIndex + 1 < section.slides.count {
            direction = 1
            withAnimation(.smooth(duration: 0.38)) {
                slideIndex += 1
            }
            return
        }

        guard sectionIndex + 1 < OnboardingCatalog.sections.count else {
            onFinish()
            return
        }

        direction = 1
        withAnimation(.smooth(duration: 0.42)) {
            sectionIndex += 1
            slideIndex = 0
        }
    }

    private func goBack() {
        if slideIndex > 0 {
            direction = -1
            withAnimation(.smooth(duration: 0.38)) {
                slideIndex -= 1
            }
            return
        }

        guard sectionIndex > 0 else { return }
        direction = -1
        withAnimation(.smooth(duration: 0.42)) {
            sectionIndex -= 1
            slideIndex = OnboardingCatalog.sections[sectionIndex].slides.count - 1
        }
    }
}

private struct TutorialHeader: View {
    let onClose: () -> Void

    var body: some View {
        ZStack {
            HStack {
                Spacer()
                AppBrandView(compact: true)
                Spacer()
            }

            HStack {
                Spacer()
                Button(action: onClose) {
                    Label("Close", systemImage: "xmark")
                        .font(.headline)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .contentShape(Rectangle())
            }
        }
        .padding(.horizontal, 24)
        .frame(height: 58)
    }
}

private struct TutorialMediaPanel: View {
    let section: OnboardingSectionID
    let slide: OnboardingSlide
    let slideIndex: Int
    let slideCount: Int
    let direction: Int
    let isAtStart: Bool
    let isAtEnd: Bool
    let onBack: () -> Void
    let onNext: () -> Void

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(red: 0.94, green: 0.91, blue: 1),
                                Color(red: 1, green: 0.90, blue: 0.93),
                                Color(red: 0.86, green: 0.91, blue: 1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )

                OnboardingMediaView(section: section, slide: slide)
                    .id(slide.id)
                    .frame(
                        width: geometry.size.width * 0.78,
                        height: geometry.size.height * 0.72
                    )
                    .transition(
                        .asymmetric(
                            insertion: .move(edge: direction > 0 ? .trailing : .leading).combined(with: .opacity),
                            removal: .move(edge: direction > 0 ? .leading : .trailing).combined(with: .opacity)
                        )
                    )

                VStack {
                    Spacer()
                    HStack(spacing: 14) {
                        TutorialNavigationButton(
                            title: "Back",
                            symbol: "chevron.left",
                            isDisabled: isAtStart,
                            action: onBack
                        )
                        .keyboardShortcut(.leftArrow, modifiers: [])

                        Spacer()

                        HStack(spacing: 7) {
                            Text(slide.title)
                                .font(.callout.weight(.semibold))
                                .lineLimit(1)
                            if slideCount > 1 {
                                Text("\(slideIndex + 1) / \(slideCount)")
                                    .font(.caption.monospacedDigit().weight(.semibold))
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.horizontal, 13)
                        .padding(.vertical, 8)
                        .background(.ultraThinMaterial, in: Capsule())

                        Spacer()

                        TutorialNavigationButton(
                            title: isAtEnd ? "Finish" : "Next",
                            symbol: isAtEnd ? "checkmark" : "chevron.right",
                            isDisabled: false,
                            action: onNext
                        )
                        .keyboardShortcut(.rightArrow, modifiers: [])
                    }
                    .padding(22)
                }
            }
        }
        .overlay {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.white.opacity(0.72), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.07), radius: 22, y: 10)
        .clipped()
    }
}

private struct TutorialNavigationButton: View {
    let title: String
    let symbol: String
    let isDisabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.callout.bold())
                .frame(width: 34, height: 34)
                .background(.ultraThinMaterial, in: Circle())
                .overlay {
                    Circle().stroke(Color.white.opacity(0.7))
                }
                .shadow(color: .black.opacity(0.08), radius: 8, y: 3)
        }
        .buttonStyle(.plain)
        .foregroundStyle(.primary)
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.35 : 1)
        .help(title)
        .accessibilityLabel(title)
    }
}

private struct TutorialStepRail: View {
    let sections: [OnboardingSection]
    let selectedIndex: Int
    let onSelect: (Int) -> Void

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(sections.enumerated()), id: \.element.id) { index, section in
                TutorialStepThumbnail(
                    number: index + 1,
                    section: section,
                    isSelected: selectedIndex == index
                ) {
                    onSelect(index)
                }
                .frame(maxHeight: .infinity)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.white.opacity(0.38), in: RoundedRectangle(cornerRadius: 17, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 17, style: .continuous)
                .stroke(Color.black.opacity(0.07))
        }
    }
}

private struct TutorialStepThumbnail: View {
    let number: Int
    let section: OnboardingSection
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 7) {
                ZStack(alignment: .topLeading) {
                    TutorialThumbnailMedia(section: section)
                        .frame(maxWidth: .infinity)
                        .aspectRatio(1.88, contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay {
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(isSelected ? Color.onboardingAccent : Color.black.opacity(0.08), lineWidth: isSelected ? 2 : 1)
                        }
                        .opacity(isSelected ? 1 : 0.56)

                    Text("\(number)")
                        .font(.callout.bold())
                        .foregroundStyle(isSelected ? .white : .secondary)
                        .frame(width: 36, height: 36)
                        .background(isSelected ? Color.onboardingAccent : Color(nsColor: .controlBackgroundColor), in: Circle())
                        .overlay {
                            Circle().stroke(Color.black.opacity(isSelected ? 0 : 0.05))
                        }
                        .offset(x: -14, y: -10)
                }

                Text(section.id.rawValue)
                    .font(.callout.weight(isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? Color.onboardingAccent : .secondary)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Step \(number), \(section.id.rawValue)")
    }
}

private struct TutorialThumbnailMedia: View {
    let section: OnboardingSection

    @ViewBuilder
    var body: some View {
        switch section.id {
        case .welcome:
            TutorialMiniBrowser {
                VStack(spacing: 6) {
                    Image(systemName: "globe")
                        .font(.title3)
                        .foregroundStyle(.indigo.opacity(0.34))
                    Capsule()
                        .fill(.white.opacity(0.86))
                        .frame(width: 86, height: 8)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(
                    LinearGradient(
                        colors: [.purple.opacity(0.12), .pink.opacity(0.15), .blue.opacity(0.11)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            }

        case .browser:
            TutorialMiniBrowser {
                ZStack(alignment: .topTrailing) {
                    VStack(alignment: .leading, spacing: 5) {
                        ForEach([0.72, 0.52, 0.64], id: \.self) { width in
                            Capsule()
                                .fill(Color.secondary.opacity(0.12))
                                .frame(width: 112 * width, height: 4)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .padding(10)

                    Image(systemName: "puzzlepiece.extension.fill")
                        .font(.title3)
                        .foregroundStyle(.blue)
                        .padding(8)
                        .background(.white.opacity(0.92), in: Circle())
                        .padding(5)
                }
            }

        case .blockers:
            TutorialMiniBrowser {
                HStack(spacing: 5) {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(0..<4, id: \.self) { index in
                            Capsule()
                                .fill(index == 1 ? Color.blue.opacity(0.28) : Color.secondary.opacity(0.12))
                                .frame(width: 31, height: 4)
                        }
                    }
                    VStack(spacing: 5) {
                        TutorialMiniSettingRow()
                        TutorialMiniSettingRow()
                    }
                }
                .padding(8)
            }

        case .analytics:
            ZStack {
                Color.white
                HStack(spacing: 7) {
                    TutorialMiniChart(kind: .line)
                    TutorialMiniChart(kind: .bars)
                }
                .padding(15)
            }

        case .tools:
            TutorialMiniBrowser {
                LazyVGrid(columns: Array(repeating: GridItem(.fixed(19), spacing: 5), count: 3), spacing: 5) {
                    ForEach(
                        ["cursorarrow", "figure.walk", "crop", "pencil", "textformat", "rectangle.on.rectangle"],
                        id: \.self
                    ) { symbol in
                        Image(systemName: symbol)
                            .font(.system(size: 8, weight: .medium))
                            .foregroundStyle(.indigo.opacity(0.72))
                            .frame(width: 19, height: 19)
                            .background(.white.opacity(0.92), in: RoundedRectangle(cornerRadius: 4))
                    }
                }
                .padding(8)
                .background(.indigo.opacity(0.05), in: RoundedRectangle(cornerRadius: 7))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
}

private struct TutorialMiniBrowser<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 3) {
                Circle().fill(.red.opacity(0.54))
                Circle().fill(.yellow.opacity(0.62))
                Circle().fill(.green.opacity(0.54))
                Capsule()
                    .fill(Color.secondary.opacity(0.1))
                    .frame(width: 68, height: 5)
                    .padding(.leading, 5)
                Spacer()
            }
            .frame(height: 14)
            .padding(.horizontal, 7)

            Divider().opacity(0.55)
            content
        }
        .background(Color.white.opacity(0.96))
    }
}

private struct TutorialMiniSettingRow: View {
    var body: some View {
        HStack(spacing: 4) {
            Capsule()
                .fill(Color.secondary.opacity(0.13))
                .frame(width: 43, height: 4)
            Spacer()
            Capsule()
                .fill(Color.blue.opacity(0.82))
                .frame(width: 17, height: 8)
                .overlay(alignment: .trailing) {
                    Circle()
                        .fill(.white)
                        .frame(width: 6, height: 6)
                        .padding(.trailing, 1)
                }
        }
        .padding(.horizontal, 6)
        .frame(width: 78, height: 18)
        .background(.white, in: RoundedRectangle(cornerRadius: 5))
        .overlay {
            RoundedRectangle(cornerRadius: 5)
                .stroke(Color.black.opacity(0.05))
        }
    }
}

private struct TutorialMiniChart: View {
    enum Kind {
        case line
        case bars
    }

    let kind: Kind

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 7)
                .fill(Color.indigo.opacity(0.035))
                .overlay {
                    RoundedRectangle(cornerRadius: 7)
                        .stroke(Color.black.opacity(0.05))
                }

            switch kind {
            case .line:
                Path { path in
                    path.move(to: CGPoint(x: 8, y: 34))
                    path.addLine(to: CGPoint(x: 18, y: 24))
                    path.addLine(to: CGPoint(x: 28, y: 29))
                    path.addLine(to: CGPoint(x: 40, y: 14))
                    path.addLine(to: CGPoint(x: 52, y: 20))
                }
                .stroke(Color.blue.opacity(0.7), style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
                .frame(width: 60, height: 44)

            case .bars:
                HStack(alignment: .bottom, spacing: 4) {
                    ForEach([15.0, 24.0, 19.0, 32.0, 39.0], id: \.self) { height in
                        RoundedRectangle(cornerRadius: 1.5)
                            .fill(Color.indigo.opacity(0.58))
                            .frame(width: 5, height: height)
                    }
                }
                .frame(height: 44, alignment: .bottom)
            }
        }
        .frame(width: 68, height: 52)
    }
}

private struct TutorialFooter: View {
    let sectionIndex: Int
    let sectionCount: Int

    var body: some View {
        HStack(spacing: 18) {
            HStack(spacing: 8) {
                ForEach(0..<sectionCount, id: \.self) { index in
                    HStack(spacing: 8) {
                        Circle()
                            .fill(
                                index < sectionIndex
                                    ? Color.onboardingAccent
                                    : Color(nsColor: .windowBackgroundColor)
                            )
                            .frame(width: 11, height: 11)
                            .overlay {
                                Circle()
                                    .stroke(
                                        index == sectionIndex
                                            ? Color.onboardingAccent
                                            : Color.secondary.opacity(0.18),
                                        lineWidth: index == sectionIndex ? 3 : 2
                                    )
                                }
                        if index < sectionCount - 1 {
                            Capsule()
                                .fill(index < sectionIndex ? Color.onboardingAccent.opacity(0.62) : Color.secondary.opacity(0.15))
                                .frame(maxWidth: .infinity)
                                .frame(height: 3)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 92)

            Color.clear
                .frame(width: 286)
        }
        .padding(.horizontal, 18)
        .frame(height: 62)
    }
}
