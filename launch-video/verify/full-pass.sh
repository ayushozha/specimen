#!/bin/bash
# Captures the motion test page and the live site with the current build, then checks every export.
set -u
cd "/Users/ayush/Desktop/03 Projects/11-24-2026-exact-replication"
(PORT=4322 node tests/serve.mjs >/dev/null 2>&1 &) ; sleep 1
for name in live5:https://www.trajectory.ai/; do
  d="/Users/ayush/Desktop/03 Projects/11-24-2026-launch-video/launch-video/verify/${name%%:*}"; url="${name#*:}"
  rm -rf "$d"; node apps/cli/src/cli.ts capture "$url" --out "$d" >/dev/null 2>&1
  SPECIMEN_VERIFY_TRACES=1 node apps/cli/src/cli.ts verify "$d"/*.zip --out "$d" 2>/dev/null > "$d/verify.txt"
  mkdir -p "$d/x" && (cd "$d/x" && unzip -oq ../*.zip)
  (cd "/Users/ayush/Desktop/03 Projects/11-24-2026-launch-video/launch-video/verify" && ./run-ae.sh "$d/x" "$d/ae-dump.json" && python3 ae_compare.py "$d/ae-dump.json" "$d/x/exports/code/replication.json" > "$d/ae.txt")
done
echo done
