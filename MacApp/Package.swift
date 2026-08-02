// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "BrowserMonitorApp",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "BrowserMonitor", targets: ["BrowserMonitorApp"])
    ],
    dependencies: [
        .package(url: "https://github.com/sparkle-project/Sparkle", exact: "2.9.4")
    ],
    targets: [
        .executableTarget(
            name: "BrowserMonitorApp",
            dependencies: [
                .product(name: "Sparkle", package: "Sparkle")
            ],
            resources: [.process("Resources")]
        ),
        .testTarget(
            name: "BrowserMonitorAppTests",
            dependencies: ["BrowserMonitorApp"]
        )
    ]
)
