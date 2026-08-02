import Foundation

@MainActor
final class AppState: ObservableObject {
    static let shared = AppState()

    @Published var selectedBrowser: BrowserOption = .chrome

    private init() {}
}
