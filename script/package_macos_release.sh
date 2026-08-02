#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
APP_PATH="$DIST_DIR/BrowserMonitor.app"
DMG_STAGING="$DIST_DIR/browser-monitor-dmg"
DMG_PATH="$DIST_DIR/BrowserMonitor.dmg"

: "${BROWSER_MONITOR_VERSION:?Set BROWSER_MONITOR_VERSION to the release version}"
: "${BROWSER_MONITOR_BUILD_NUMBER:?Set BROWSER_MONITOR_BUILD_NUMBER to a monotonically increasing integer}"

BROWSER_MONITOR_CONFIGURATION=release "$ROOT_DIR/script/build_and_run.sh" build

rm -rf "$DMG_STAGING"
rm -f "$DMG_PATH"
mkdir -p "$DMG_STAGING"
cp -R "$APP_PATH" "$DMG_STAGING/"
ln -s /Applications "$DMG_STAGING/Applications"

/usr/bin/hdiutil create \
  -volname "Browser Monitor" \
  -srcfolder "$DMG_STAGING" \
  -ov \
  -format UDZO \
  "$DMG_PATH"

rm -rf "$DMG_STAGING"
echo "Created $DMG_PATH"
