import Foundation

struct ReleaseInfo: Decodable, Equatable {
    let tagName: String
    let name: String
    let pageURL: URL
    let assets: [Asset]

    struct Asset: Decodable, Equatable {
        let name: String
        let downloadURL: URL
        let size: Int

        enum CodingKeys: String, CodingKey {
            case name
            case downloadURL = "browser_download_url"
            case size
        }
    }

    enum CodingKeys: String, CodingKey {
        case tagName = "tag_name"
        case name
        case pageURL = "html_url"
        case assets
    }

    var zipAsset: Asset? {
        assets
            .filter { $0.name.lowercased().hasSuffix(".zip") }
            .sorted { $0.size < $1.size }
            .first
    }

    var displayVersion: String {
        tagName.hasPrefix("v") ? String(tagName.dropFirst()) : tagName
    }
}
