#!/usr/bin/env bash
# 入库前检查：禁止明文密钥进入 git
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PATTERNS=(
  'sk-cp-'
  'sk-[a-zA-Z0-9]{20,}'
  'LIxu20021008'
  'Jzj@981228'
  'jzj2001'
  'gczx@303'
)

SELF="$(basename "$0")"
FAIL=0
while IFS= read -r -d '' f; do
  [[ "$(basename "$f")" == "$SELF" ]] && continue
  [[ "$f" == *node_modules* ]] && continue
  [[ "$f" == */target/* ]] && continue
  [[ "$f" == */.env ]] && continue
  [[ "$f" == */.env.mw ]] && continue
  [[ "$f" == */.env.worker ]] && continue
  [[ "$f" == */.env.split ]] && continue
  [[ "$f" == */env.bat ]] && continue
  for p in "${PATTERNS[@]}"; do
    if grep -qE "$p" "$f" 2>/dev/null; then
      echo "[FAIL] $f matches /$p/"
      FAIL=1
    fi
  done
done < <(
  if git rev-parse --is-inside-work-tree &>/dev/null && [[ -n "$(git ls-files)" ]]; then
    git ls-files -z
  else
    find . -type f \( -name '*.yml' -o -name '*.yaml' -o -name '*.py' -o -name '*.sh' -o -name '*.env.example' -o -name '*.md' -o -name '*.java' -o -name '*.ts' \) \
      ! -path './.git/*' ! -path '*/node_modules/*' ! -path '*/target/*' -print0 2>/dev/null
  fi
)

if [[ "$FAIL" -eq 1 ]]; then
  echo "Secret scan failed. Fix before commit."
  exit 1
fi
echo "[OK] No known secret patterns in tracked-like files"
