#!/bin/bash
# Runs a bundle's After Effects script inside After Effects and dumps the evaluated keyframes.
# Usage: run-ae.sh <unzipped bundle dir> <dump.json>
JSX="$(cd "$1" && pwd)/exports/after-effects/specimen.jsx"
OUT="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
DUMP="$(cd "$(dirname "$0")" && pwd)/ae-dump.jsx"
rm -f "$OUT" "$OUT.err"
osascript -e "tell application \"Adobe After Effects 2026\" to DoScript \"var SPECIMEN_JSX = '$JSX'; var DUMP_OUT = '$OUT'; try { \$.evalFile(File('$DUMP')); } catch (e) { var f = File('$OUT.err'); f.open('w'); f.write(e.toString() + ' @ line ' + e.line + ' ' + (e.fileName || '')); f.close(); }\"" >/dev/null
[ -f "$OUT.err" ] && cat "$OUT.err" && exit 1
exit 0
