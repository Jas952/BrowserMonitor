import Foundation

@MainActor
final class AppState: ObservableObject {
    static let shared = AppState()

    @Published var selectedBrowser: BrowserOption = .chrome

    private let defaults: UserDefaults
    private static let onboardingKey = "hasCompletedOnboarding"

    private init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func presentInitialOnboardingIfNeeded() {
        guard !defaults.bool(forKey: Self.onboardingKey) else { return }
        presentOnboarding()
    }

    func presentOnboarding() {
        OnboardingWindowCoordinator.shared.present { [weak self] in
            self?.completeOnboarding()
        }
    }

    func completeOnboarding() {
        defaults.set(true, forKey: Self.onboardingKey)
    }

    func resetOnboarding() {
        defaults.set(false, forKey: Self.onboardingKey)
        presentOnboarding()
    }
}
