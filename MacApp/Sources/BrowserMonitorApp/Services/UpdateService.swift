import Foundation
import Sparkle

@MainActor
final class UpdateService: NSObject, ObservableObject, SPUUpdaterDelegate {
    static let shared = UpdateService()

    enum Status: Equatable {
        case idle
        case checking
        case upToDate
        case available(String)
        case installed
        case failed(String)

        var symbolName: String {
            switch self {
            case .idle: "arrow.triangle.2.circlepath"
            case .checking: "arrow.triangle.2.circlepath"
            case .upToDate, .installed: "checkmark.circle.fill"
            case .available: "arrow.down.circle.fill"
            case .failed: "exclamationmark.triangle.fill"
            }
        }

        var detailText: String {
            switch self {
            case .idle: "Check for updates"
            case .checking: "Checking for updates…"
            case .upToDate: "Browser Monitor is up to date."
            case .available(let version): "Browser Monitor \(version) is available."
            case .installed: "Browser Monitor was updated successfully."
            case .failed(let message): message
            }
        }
    }

    enum ManualCheckCompletion: Equatable {
        case noUpdate
        case failed(String)
    }

    struct ManualCheckPresentation: Equatable {
        let status: Status
        let notice: Notice
    }

    struct Notice: Equatable {
        let title: String
        let message: String
    }

    enum FeedPreflightError: LocalizedError {
        case missingFeedURL
        case invalidResponse
        case httpStatus(Int)

        var errorDescription: String? {
            switch self {
            case .missingFeedURL:
                "The update feed is not configured."
            case .invalidResponse:
                "The update feed returned an invalid response."
            case .httpStatus(let statusCode):
                "The update server returned HTTP \(statusCode)."
            }
        }
    }

    @Published private(set) var status: Status = .idle
    @Published private(set) var canCheckForUpdates = false
    @Published private(set) var notice: Notice?

    private static let pendingVersionKey = "BrowserMonitorPendingUpdateVersion"
    private var manualCheckInProgress = false
    private var statusResetTask: Task<Void, Never>?
    private var updaterObservation: NSKeyValueObservation?

    private lazy var controller = SPUStandardUpdaterController(
        startingUpdater: true,
        updaterDelegate: self,
        userDriverDelegate: nil
    )

    override private init() {
        super.init()

        let updater = controller.updater
        updater.automaticallyChecksForUpdates = true
        updater.automaticallyDownloadsUpdates = false
        updaterObservation = updater.observe(\.canCheckForUpdates, options: [.initial, .new]) { [weak self] updater, _ in
            Task { @MainActor in
                self?.canCheckForUpdates = updater.canCheckForUpdates
            }
        }

        if let pendingVersion = UserDefaults.standard.string(forKey: Self.pendingVersionKey),
           Self.compareVersions(currentVersion, pendingVersion) != .orderedAscending {
            status = .installed
            UserDefaults.standard.removeObject(forKey: Self.pendingVersionKey)
            scheduleIdleStatus()
        }
    }

    var currentVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
    }

    func checkForUpdates() {
        guard canCheckForUpdates else {
            completeManualCheck(.failed("The update checker is not ready."))
            return
        }

        statusResetTask?.cancel()
        manualCheckInProgress = true
        status = .checking
        Task { [weak self] in
            await self?.startManualCheckWhenFeedIsAvailable()
        }
    }

    func dismissNotice() {
        notice = nil
    }

    private func startManualCheckWhenFeedIsAvailable() async {
        do {
            let feedURL = Bundle.main.object(forInfoDictionaryKey: "SUFeedURL") as? String
            let url = try Self.feedURL(from: feedURL)
            var request = URLRequest(url: url)
            request.cachePolicy = .reloadIgnoringLocalCacheData
            request.timeoutInterval = 12
            let (_, response) = try await URLSession.shared.data(for: request)
            try Self.validateFeedResponse(response)
            controller.updater.checkForUpdates()
        } catch {
            completeManualCheck(Self.failureCompletion(for: error))
        }
    }

    func updater(_ updater: SPUUpdater, didFindValidUpdate item: SUAppcastItem) {
        let version = item.displayVersionString
        status = .available(version)
        manualCheckInProgress = false
        UserDefaults.standard.set(version, forKey: Self.pendingVersionKey)
    }

    func updaterDidNotFindUpdate(_ updater: SPUUpdater, error: Error) {
        guard manualCheckInProgress else { return }
        completeManualCheck(.noUpdate)
    }

    func updater(_ updater: SPUUpdater, didAbortWithError error: Error) {
        guard manualCheckInProgress else { return }
        completeManualCheck(Self.failureCompletion(for: error))
    }

    private func scheduleIdleStatus() {
        statusResetTask?.cancel()
        statusResetTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(3))
            guard !Task.isCancelled else { return }
            self?.status = .idle
        }
    }

    private func completeManualCheck(_ completion: ManualCheckCompletion) {
        let presentation = Self.presentation(for: completion)
        manualCheckInProgress = false
        status = presentation.status
        notice = presentation.notice
        scheduleIdleStatus()
    }

    nonisolated static func feedURL(from value: String?) throws -> URL {
        guard let value, let url = URL(string: value) else {
            throw FeedPreflightError.missingFeedURL
        }
        return url
    }

    nonisolated static func validateFeedResponse(_ response: URLResponse) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw FeedPreflightError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw FeedPreflightError.httpStatus(httpResponse.statusCode)
        }
    }

    nonisolated static func failureCompletion(for error: Error) -> ManualCheckCompletion {
        .failed(error.localizedDescription)
    }

    nonisolated static func presentation(for completion: ManualCheckCompletion) -> ManualCheckPresentation {
        switch completion {
        case .noUpdate:
            ManualCheckPresentation(
                status: .upToDate,
                notice: Notice(
                    title: "No updates available",
                    message: "Browser Monitor is up to date."
                )
            )
        case .failed(let detail):
            ManualCheckPresentation(
                status: .failed("Unable to check for updates. \(detail)"),
                notice: Notice(
                    title: "Unable to check for updates",
                    message: detail
                )
            )
        }
    }

    nonisolated static func compareVersions(_ lhs: String, _ rhs: String) -> ComparisonResult {
        lhs.compare(rhs, options: .numeric)
    }
}
