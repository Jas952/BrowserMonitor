#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
APP_NAME="BrowserMonitor"
BUNDLE_ID="dev.browsermonitor.companion"
MIN_SYSTEM_VERSION="14.0"
BUILD_CONFIGURATION="${BROWSER_MONITOR_CONFIGURATION:-debug}"
APP_VERSION="${BROWSER_MONITOR_VERSION:-0.1.0}"
APP_BUILD_NUMBER="${BROWSER_MONITOR_BUILD_NUMBER:-1}"
SPARKLE_PUBLIC_KEY="${BROWSER_MONITOR_SPARKLE_PUBLIC_KEY:-DKZ5lZYnbPUGdDjI/eKNur1rIky8H3MQ4AQBpEAesuo=}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_DIR="$ROOT_DIR/MacApp"
DIST_DIR="$ROOT_DIR/dist"
APP_BUNDLE="$DIST_DIR/$APP_NAME.app"
APP_CONTENTS="$APP_BUNDLE/Contents"
APP_MACOS="$APP_CONTENTS/MacOS"
APP_RESOURCES="$APP_CONTENTS/Resources"
APP_FRAMEWORKS="$APP_CONTENTS/Frameworks"
APP_BINARY="$APP_MACOS/$APP_NAME"
INFO_PLIST="$APP_CONTENTS/Info.plist"
ICON_SOURCE="$PACKAGE_DIR/Sources/BrowserMonitorApp/Resources/browser-monitor.png"
ICONSET_DIR="$DIST_DIR/AppIcon.iconset"

pkill -x "$APP_NAME" >/dev/null 2>&1 || true

swift build --package-path "$PACKAGE_DIR" --configuration "$BUILD_CONFIGURATION"
BIN_PATH="$(swift build --package-path "$PACKAGE_DIR" --configuration "$BUILD_CONFIGURATION" --show-bin-path)"
BUILD_BINARY="$BIN_PATH/$APP_NAME"

rm -rf "$APP_BUNDLE"
mkdir -p "$APP_MACOS" "$APP_RESOURCES" "$APP_FRAMEWORKS"
cp "$BUILD_BINARY" "$APP_BINARY"
chmod +x "$APP_BINARY"

cp -R "$BIN_PATH/Sparkle.framework" "$APP_FRAMEWORKS/"
/usr/bin/install_name_tool -add_rpath "@executable_path/../Frameworks" "$APP_BINARY"

RESOURCE_BUNDLE="$BIN_PATH/BrowserMonitorApp_BrowserMonitorApp.bundle"
if [[ -d "$RESOURCE_BUNDLE" ]]; then
  cp -R "$RESOURCE_BUNDLE" "$APP_RESOURCES/"
fi

rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"
for icon_size in 16 32 64 128 256 512 1024; do
  case "$icon_size" in
    16) icon_name="icon_16x16.png" ;;
    32) icon_name="icon_16x16@2x.png" ;;
    64) icon_name="icon_32x32@2x.png" ;;
    128) icon_name="icon_128x128.png" ;;
    256) icon_name="icon_128x128@2x.png" ;;
    512) icon_name="icon_256x256@2x.png" ;;
    1024) icon_name="icon_512x512@2x.png" ;;
  esac
  /usr/bin/sips -z "$icon_size" "$icon_size" "$ICON_SOURCE" --out "$ICONSET_DIR/$icon_name" >/dev/null
done
cp "$ICONSET_DIR/icon_16x16@2x.png" "$ICONSET_DIR/icon_32x32.png"
cp "$ICONSET_DIR/icon_128x128@2x.png" "$ICONSET_DIR/icon_256x256.png"
cp "$ICONSET_DIR/icon_256x256@2x.png" "$ICONSET_DIR/icon_512x512.png"
/usr/bin/iconutil -c icns "$ICONSET_DIR" -o "$APP_RESOURCES/AppIcon.icns"
rm -rf "$ICONSET_DIR"

cat >"$INFO_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>$APP_NAME</string>
  <key>CFBundleIdentifier</key>
  <string>$BUNDLE_ID</string>
  <key>CFBundleName</key>
  <string>Browser Monitor</string>
  <key>CFBundleDisplayName</key>
  <string>Browser Monitor</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>$APP_VERSION</string>
  <key>CFBundleVersion</key>
  <string>$APP_BUILD_NUMBER</string>
  <key>LSMinimumSystemVersion</key>
  <string>$MIN_SYSTEM_VERSION</string>
  <key>NSPrincipalClass</key>
  <string>NSApplication</string>
  <key>SUFeedURL</key>
  <string>https://raw.githubusercontent.com/Jas952/BrowserMonitor/main/appcast.xml</string>
  <key>SUPublicEDKey</key>
  <string>$SPARKLE_PUBLIC_KEY</string>
  <key>SUScheduledCheckInterval</key>
  <integer>21600</integer>
  <key>SUEnableAutomaticChecks</key>
  <true/>
  <key>SUAutomaticallyUpdate</key>
  <false/>
</dict>
</plist>
PLIST

/usr/bin/codesign --force --deep --sign - "$APP_FRAMEWORKS/Sparkle.framework"
/usr/bin/codesign --force --deep --sign - "$APP_BUNDLE"
/usr/bin/codesign --verify --deep --strict "$APP_BUNDLE"

open_app() {
  /usr/bin/open -n "$APP_BUNDLE"
}

case "$MODE" in
  build)
    ;;
  run)
    open_app
    ;;
  --debug|debug)
    lldb -- "$APP_BINARY"
    ;;
  --logs|logs)
    open_app
    /usr/bin/log stream --info --style compact --predicate "process == \"$APP_NAME\""
    ;;
  --telemetry|telemetry)
    open_app
    /usr/bin/log stream --info --style compact --predicate "subsystem == \"$BUNDLE_ID\""
    ;;
  --verify|verify)
    open_app
    sleep 2
    pgrep -x "$APP_NAME" >/dev/null
    ;;
  *)
    echo "usage: $0 [build|run|--debug|--logs|--telemetry|--verify]" >&2
    exit 2
    ;;
esac
