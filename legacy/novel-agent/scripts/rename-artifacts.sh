#!/usr/bin/env bash
# Maven 模块 novel-agent-* → agent-*，并更新仓库内引用（保留父 artifact novel-agent）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
cd "$ROOT"

rename_dir() {
  local from="$1" to="$2"
  if [[ -d "$from" && ! -e "$to" ]]; then
    mv "$from" "$to"
    echo "[mv] $from -> $to"
  fi
}

rename_dir agent-common agent-common
rename_dir agent-common/agent-common-mq agent-common/agent-common-mq
rename_dir agent-gateway agent-gateway
rename_dir agent-auth agent-auth
rename_dir agent-pyai agent-pyai
rename_dir agent-content agent-content
rename_dir agent-consumer agent-consumer

replace_in_file() {
  local f="$1"
  sed -i \
    -e 's/agent-common-mq/agent-common-mq/g' \
    -e 's/agent-gateway/agent-gateway/g' \
    -e 's/agent-consumer/agent-consumer/g' \
    -e 's/agent-content/agent-content/g' \
    -e 's/agent-pyai/agent-pyai/g' \
    -e 's/agent-auth/agent-auth/g' \
    -e 's/agent-common/agent-common/g' \
    "$f"
}

while IFS= read -r -d '' f; do
  if grep -q 'novel-agent-\(gateway\|auth\|pyai\|content\|consumer\|common\)' "$f" 2>/dev/null; then
    replace_in_file "$f"
  fi
done < <(find "$REPO" -type f \
  ! -path '*/target/*' ! -path '*/.git/*' ! -path '*/node_modules/*' \
  \( -name '*.xml' -o -name '*.yml' -o -name '*.yaml' -o -name '*.sh' -o -name '*.cmd' -o -name '*.bat' -o -name '*.md' -o -name '*.mdc' -o -name '*.py' -o -name '*.java' -o -name '*.conf' -o -name '*.template' -o -name 'Dockerfile*' \) -print0)

# Nacos 模板文件名
for dir in docs/deploy/nacos docs/deploy/docker/nacos docs/deploy/docker/nacos-split; do
  [[ -d "$ROOT/$dir" ]] || continue
  for old in agent-gateway agent-auth agent-pyai agent-content agent-consumer; do
    # files may already be renamed by content; handle legacy names
    :
  done
  for legacy in agent-gateway agent-auth agent-pyai agent-content agent-consumer; do
    new="${legacy/novel-agent-/agent-}"
    if [[ -f "$ROOT/$dir/$legacy.yaml" ]]; then
      mv "$ROOT/$dir/$legacy.yaml" "$ROOT/$dir/$new.yaml"
      echo "[mv] $dir/$legacy.yaml -> $new.yaml"
    fi
  done
done

echo "[OK] artifact rename complete"
