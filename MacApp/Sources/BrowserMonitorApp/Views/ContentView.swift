import SwiftUI

struct ContentView: View {
    @StateObject private var downloadManager = ReleaseDownloadManager()

    var body: some View {
        BrowserSelectionView(downloadManager: downloadManager)
            .frame(width: 620, height: 320)
    }
}
