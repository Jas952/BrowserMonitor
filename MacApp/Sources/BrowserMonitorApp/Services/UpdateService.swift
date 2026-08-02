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

    @Published private(set) var status: Status = .idle
    @Published private(set) var canCheckForUpdates = false
    @Published private(set) var notice: String?

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
            presentNoUpdatesNotice()
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
        guard let feedURL = Bundle.main.object(forInfoDictionaryKey: "SUFeedURL") as? String,
              let url = URL(string: feedURL) else {
            manualCheckInProgress = false
            presentNoUpdatesNotice()
            return
        }

        do {
            var request = URLRequest(url: url)
            request.cachePolicy = .reloadIgnoringLocalCacheData
            request.timeoutInterval = 12
            let (_, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                manualCheckInProgress = false
                presentNoUpdatesNotice()
                return
            }

            guard (200..<300).contains(httpResponse.statusCode) else {
                manualCheckInProgress = false
                presentNoUpdatesNotice()
                return
            }

            controller.updater.checkForUpdates()
        } catch {
            manualCheckInProgress = false
            presentNoUpdatesNotice()
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
        manualCheckInProgress = false
        status = .upToDate
        scheduleIdleStatus()
    }

    func updater(_ updater: SPUUpdater, didAbortWithError error: Error) {
        guard manualCheckInProgress else { return }
        manualCheckInProgress = false
        status = .failed(error.localizedDescription)
        scheduleIdleStatus()
    }

    private func scheduleIdleStatus() {
        statusResetTask?.cancel()
        statusResetTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(3))
            guard !Task.isCancelled else { return }
            self?.status = .idle
        }
    }

    private func presentNoUpdatesNotice() {
        notice = "No updates available."
        status = .upToDate
        scheduleIdleStatus()
    }

    nonisolated static func compareVersions(_ lhs: String, _ rhs: String) -> ComparisonResult {
        lhs.compare(rhs, options: .numeric)
    }
}
