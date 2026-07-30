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
    targets: [
        .executableTarget(
            name: "BrowserMonitorApp",
            resources: [.process("Resources")]
        ),
        .testTarget(
            name: "BrowserMonitorAppTests",
            dependencies: ["BrowserMonitorApp"]
        )
    ]
)
