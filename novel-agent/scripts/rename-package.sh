#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

while IFS= read -r -d '' dir; do
  java_root="$(dirname "$dir")"
  mkdir -p "$java_root/novel/agent"
  shopt -s nullglob
  for item in "$dir"/*; do
    mv "$item" "$java_root/novel/agent/"
  done
  shopt -u nullglob
  rm -rf "$dir"
done < <(find . -type d -path '*/java/com/novelai' -print0)

find . -type d -empty -path '*/com/novelai' -delete 2>/dev/null || true

while IFS= read -r -d '' f; do
  if grep -q 'com.novel.agent' "$f" 2>/dev/null; then
    sed -i 's/com\.novelai/com.novel.agent/g' "$f"
  fi
done < <(find . -type f \
  ! -path '*/target/*' \
  \( -name '*.java' -o -name '*.xml' -o -name '*.yml' -o -name '*.yaml' -o -name '*.sh' -o -name '*.cmd' -o -name '*.md' -o -name '*.imports' \) -print0)

echo '[OK] package rename complete'
