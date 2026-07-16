#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

(cd Extension && npm test)
node --check Extension/content.js
node --check Extension/popup.js
node --check Extension/options.js
node --check Extension/service-worker.js

echo "All Browser Monitor checks passed."
