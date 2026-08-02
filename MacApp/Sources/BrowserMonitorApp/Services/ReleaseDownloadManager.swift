import AppKit
import Foundation

@MainActor
final class ReleaseDownloadManager: ObservableObject {
    enum State: Equatable {
        case idle
        case resolving
        case ready(ReleaseInfo)
        case downloading(ReleaseInfo)
        case downloaded(ReleaseInfo, URL)
        case failed(String)
    }

    @Published private(set) var state: State = .idle

    private let releaseProvider: ReleaseProviding
    private let session: URLSession
    private let fileManager: FileManager

    init(
        releaseProvider: ReleaseProviding = GitHubReleaseService(),
        session: URLSession = .shared,
        fileManager: FileManager = .default
    ) {
        self.releaseProvider = releaseProvider
        self.session = session
        self.fileManager = fileManager
    }

    func resolveLatestRelease() async {
        guard case .idle = state else { return }
        state = .resolving
        do {
            state = .ready(try await releaseProvider.latestRelease())
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func downloadLatest() async {
        let release: ReleaseInfo
        switch state {
        case .ready(let value), .downloaded(let value, _):
            release = value
        case .idle, .failed:
            state = .resolving
            do {
                release = try await releaseProvider.latestRelease()
            } catch {
                state = .failed(error.localizedDescription)
                return
            }
        case .resolving, .downloading:
            return
        }

        guard let asset = release.zipAsset else {
            state = .failed(ReleaseError.missingZip.localizedDescription)
            return
        }

        await download(asset: asset, from: release)
    }

    func downloadArchive(from url: URL, filename: String? = nil) async {
        guard !isBusy else { return }

        let urlFilename = url.lastPathComponent
        let preferredFilename = filename?.trimmingCharacters(in: .whitespacesAndNewlines)
        let resolvedFilename: String
        if let preferredFilename, !preferredFilename.isEmpty {
            resolvedFilename = preferredFilename
        } else {
            resolvedFilename = urlFilename.lowercased().hasSuffix(".zip")
                ? urlFilename
                : "browser-monitor.zip"
        }
        let asset = ReleaseInfo.Asset(name: resolvedFilename, downloadURL: url, size: 0)
        let release = ReleaseInfo(
            tagName: "direct",
            name: "Direct ZIP download",
            pageURL: url,
            assets: [asset]
        )

        await download(asset: asset, from: release)
    }

    private var isBusy: Bool {
        switch state {
        case .resolving, .downloading:
            true
        case .idle, .ready, .downloaded, .failed:
            false
        }
    }

    private func download(asset: ReleaseInfo.Asset, from release: ReleaseInfo) async {
        state = .downloading(release)
        do {
            let (temporaryURL, _) = try await session.download(from: asset.downloadURL)
            guard let downloads = fileManager.urls(for: .downloadsDirectory, in: .userDomainMask).first else {
                throw ReleaseError.downloadsFolderUnavailable
            }
            let destination = availableDestination(in: downloads, filename: asset.name)
            try fileManager.moveItem(at: temporaryURL, to: destination)
            state = .downloaded(release, destination)
            if UserDefaults.standard.object(forKey: "automaticallyRevealDownload") == nil
                || UserDefaults.standard.bool(forKey: "automaticallyRevealDownload") {
                NSWorkspace.shared.activateFileViewerSelecting([destination])
            }
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func retry() async {
        state = .idle
        await resolveLatestRelease()
    }

    private func availableDestination(in directory: URL, filename: String) -> URL {
        let preferred = directory.appendingPathComponent(filename)
        guard fileManager.fileExists(atPath: preferred.path) else { return preferred }

        let extensionName = preferred.pathExtension
        let stem = preferred.deletingPathExtension().lastPathComponent
        var index = 2
        while true {
            let candidate = directory
                .appendingPathComponent("\(stem)-\(index)")
                .appendingPathExtension(extensionName)
            if !fileManager.fileExists(atPath: candidate.path) {
                return candidate
            }
            index += 1
        }
    }
}
