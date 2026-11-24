#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${TMPDIR:-/tmp}/TempoTimelineCoreTests.exe"
command -v mcs >/dev/null || { echo '需要 Mono C# 编译器 mcs。' >&2; exit 2; }
command -v mono >/dev/null || { echo '需要 Mono 运行时。' >&2; exit 2; }
mcs -langversion:latest -r:System.Core -r:System.Runtime.Serialization \
  -out:"$OUT" \
  "$ROOT/com-addin/TimelineModel.cs" \
  "$ROOT/com-addin/TimelineLayout.cs" \
  "$ROOT/tests/CSharpCoreSmokeTests.cs"
mono "$OUT"
