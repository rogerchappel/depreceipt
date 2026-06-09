#!/usr/bin/env bash
set -euo pipefail

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

cat >"$tmpdir/package-lock.json" <<'JSON'
{
  "lockfileVersion": 3,
  "packages": {
    "": { "name": "depreceipt-smoke" },
    "node_modules/left-pad": { "version": "1.3.0" },
    "node_modules/typescript": { "version": "5.8.0", "dev": true }
  }
}
JSON

node dist/src/cli.js scan --cwd "$tmpdir" --output "$tmpdir/depreceipt.json"
node dist/src/cli.js scan --cwd "$tmpdir" --format markdown --output "$tmpdir/depreceipt.md"
node dist/src/cli.js explain --receipt "$tmpdir/depreceipt.json" --output "$tmpdir/explanation.md"

grep -q '"totalPackages": 2' "$tmpdir/depreceipt.json"
grep -q 'left-pad' "$tmpdir/depreceipt.md"
grep -q '2 packages found' "$tmpdir/explanation.md"
