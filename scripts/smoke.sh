#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

FIXTURE_DIR="$TMP_DIR/project"
mkdir -p "$FIXTURE_DIR"

cat >"$FIXTURE_DIR/package-lock.json" <<'JSON'
{
  "name": "fixture",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "packages": {
    "": {
      "name": "fixture",
      "version": "1.0.0",
      "dependencies": {
        "left-pad": "1.3.0"
      }
    },
    "node_modules/left-pad": {
      "version": "1.3.0"
    }
  }
}
JSON

cd "$ROOT_DIR"
npm run build >/dev/null

node dist/src/cli.js scan --cwd "$FIXTURE_DIR" --output "$TMP_DIR/receipt.json"
node -e "const fs=require('node:fs'); const receipt=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if (receipt.summary.totalPackages !== 1) process.exit(1); if (receipt.packages[0].name !== 'left-pad') process.exit(1);" "$TMP_DIR/receipt.json"

node dist/src/cli.js explain --receipt "$TMP_DIR/receipt.json" --output "$TMP_DIR/explain.md"
grep -q '1 packages found across 1 source file(s).' "$TMP_DIR/explain.md"
