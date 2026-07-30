import Foundation

enum OnboardingMediaAsset {
    case image(URL)
    case video(URL)
}

enum OnboardingMediaResolver {
    private static let imageExtensions = ["png", "jpg", "jpeg", "webp"]
    private static let videoExtensions = ["mp4", "mov", "m4v"]

    static func asset(named name: String) -> OnboardingMediaAsset? {
        for extensionName in videoExtensions {
            if let url = resourceURL(name: name, extensionName: extensionName) {
                return .video(url)
            }
        }

        for extensionName in imageExtensions {
            if let url = resourceURL(name: name, extensionName: extensionName) {
                return .image(url)
            }
        }

        return nil
    }

    static func poster(named name: String) -> URL? {
        for extensionName in imageExtensions {
            if let url = resourceURL(name: "\(name)-poster", extensionName: extensionName) {
                return url
            }
            if let url = resourceURL(name: name, extensionName: extensionName) {
                return url
            }
        }
        return nil
    }

    private static func resourceURL(name: String, extensionName: String) -> URL? {
        Bundle.module.url(
            forResource: name,
            withExtension: extensionName,
            subdirectory: "OnboardingMedia"
        ) ?? Bundle.module.url(forResource: name, withExtension: extensionName)
    }
}
