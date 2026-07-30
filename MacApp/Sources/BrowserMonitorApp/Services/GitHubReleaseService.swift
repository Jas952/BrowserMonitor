import Foundation

protocol ReleaseProviding {
    func latestRelease() async throws -> ReleaseInfo
}

struct GitHubReleaseService: ReleaseProviding {
    private let session: URLSession
    private let endpoint = URL(string: "https://api.github.com/repos/Jas952/BrowserMonitor/releases/latest")!

    init(session: URLSession = .shared) {
        self.session = session
    }

    func latestRelease() async throws -> ReleaseInfo {
        var request = URLRequest(url: endpoint)
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("BrowserMonitor-macOS", forHTTPHeaderField: "User-Agent")

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw ReleaseError.unavailable
        }

        let release = try JSONDecoder().decode(ReleaseInfo.self, from: data)
        guard release.zipAsset != nil else {
            throw ReleaseError.missingZip
        }
        return release
    }
}

enum ReleaseError: LocalizedError {
    case unavailable
    case missingZip
    case downloadsFolderUnavailable

    var errorDescription: String? {
        switch self {
        case .unavailable:
            "Не удалось получить данные последнего GitHub Release."
        case .missingZip:
            "В последнем релизе не найден ZIP-файл расширения."
        case .downloadsFolderUnavailable:
            "Не удалось открыть папку «Загрузки»."
        }
    }
}
