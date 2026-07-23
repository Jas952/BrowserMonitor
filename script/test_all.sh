#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

(cd Extension && npm test)
node --check Extension/content.js
node --check Extension/link-safety.js
node --check Extension/link-warning.js
node --check Extension/popup.js
node --check Extension/options.js
node --check Extension/service-worker.js
node --check Extension/statistics.js
node --check Extension/statistics-page.js

echo "All Browser Monitor checks passed."
