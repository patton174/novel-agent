#!/usr/bin/env bash
# 部署前确保 Worker .env.worker 含有效 JWT_SECRET（≥32）与 internal key
set -euo pipefail

CI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$CI_DIR/_common.sh"
ci_require_deploy_env
ci_setup_ssh

REMOTE="$(ci_remote worker)"
RDIR="$(ci_remote_dir worker)"
ENV_REL="$DOCKER_REL/$(ci_env_file worker)"

env_get_remote() {
  local host="$1" file="$2" key="$3"
  deploy_ssh "$host" bash -s <<EOF
set -euo pipefail
f='$RDIR/$file'
[[ -f "\$f" ]] || exit 0
grep -E '^${key}=' "\$f" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^"//;s/"\$//' || true
EOF
}

patch_env_remote() {
  local host="$1" file="$2" key="$3" val="$4"
  local val_b64
  val_b64="$(printf '%s' "$val" | base64 | tr -d '\n')"
  deploy_ssh "$host" bash -s <<EOF
set -euo pipefail
f='$RDIR/$file'
val="\$(printf '%s' '$val_b64' | base64 -d)"
touch "\$f"
grep -v '^${key}=' "\$f" > "\$f.tmp" || true
printf '%s=%s\n' '${key}' "\$val" >> "\$f.tmp"
mv "\$f.tmp" "\$f"
EOF
}

read_secret() {
  local key="$1"
  local v=""
  v="$(env_get_remote "$REMOTE" "$ENV_REL" "$key" || true)"
  if [[ -n "$v" ]]; then
    printf '%s' "$v"
    return 0
  fi
  for src in \
    "legacy/novel-agent/agent-document/docs/deploy/docker/.env.worker" \
    "legacy/novel-agent/agent-document/docs/deploy/docker/.env.mw" \
    "legacy/novel-agent/agent-document/docs/deploy/docker/.env.split"; do
    v="$(env_get_remote "$(ci_remote mw)" "$src" "$key" || true)"
    if [[ -n "$v" ]]; then
      printf '%s' "$v"
      return 0
    fi
  done
  return 1
}

ensure_key() {
  local key="$1" min_len="${2:-1}" ci_val="${3:-}"
  local current="" resolved=""

  current="$(env_get_remote "$REMOTE" "$ENV_REL" "$key" || true)"
  if [[ -n "$current" && ${#current} -ge "$min_len" ]]; then
    echo "[ensure-secrets] $key ok on worker (${#current} chars)"
    return 0
  fi

  if [[ -n "$ci_val" && ${#ci_val} -ge "$min_len" ]]; then
    resolved="$ci_val"
    echo "[ensure-secrets] $key from CI env"
  else
    resolved="$(read_secret "$key" || true)"
    if [[ -n "$resolved" ]]; then
      echo "[ensure-secrets] $key synced from MW/legacy env"
    fi
  fi

  [[ -n "$resolved" && ${#resolved} -ge "$min_len" ]] || {
    echo "[ensure-secrets] ERROR: $key missing or shorter than $min_len chars on worker"
    exit 1
  }

  patch_env_remote "$REMOTE" "$ENV_REL" "$key" "$resolved"
}

sync_key_optional() {
  local key="$1" min_len="${2:-8}" ci_val="${3:-}"
  local current="" resolved=""

  current="$(env_get_remote "$REMOTE" "$ENV_REL" "$key" || true)"
  if [[ -n "$current" && ${#current} -ge "$min_len" ]]; then
    echo "[ensure-secrets] $key ok on worker (${#current} chars)"
    return 0
  fi

  if [[ -n "$ci_val" && ${#ci_val} -ge "$min_len" ]]; then
    resolved="$ci_val"
  else
    resolved="$(read_secret "$key" || true)"
  fi

  if [[ -n "$resolved" && ${#resolved} -ge "$min_len" ]]; then
    patch_env_remote "$REMOTE" "$ENV_REL" "$key" "$resolved"
    echo "[ensure-secrets] $key synced to worker"
    return 0
  fi

  echo "[ensure-secrets] WARN: $key missing on worker (email features disabled until set)"
}

echo "[ensure-secrets] checking $ENV_REL on worker..."
ensure_key JWT_SECRET 32 "${JWT_SECRET:-}"
ensure_key AGENT_INTERNAL_SERVICE_KEY 8 "${AGENT_INTERNAL_SERVICE_KEY:-}"
sync_key_optional MAILTRAP_TOKEN 8 "${MAILTRAP_TOKEN:-}"
sync_key_optional AUTH_EMAIL_LINK_SECRET 16 "${AUTH_EMAIL_LINK_SECRET:-}"

ensure_turnstile() {
  local enabled="${TURNSTILE_ENABLED:-true}"
  if [[ "${enabled,,}" != "true" ]]; then
    echo "[ensure-secrets] TURNSTILE_ENABLED=$enabled，跳过 Turnstile"
    return 0
  fi
  patch_env_remote "$REMOTE" "$ENV_REL" "TURNSTILE_ENABLED" "true"
  ensure_key TURNSTILE_SITE_KEY 10 "${TURNSTILE_SITE_KEY:-}"
  ensure_key TURNSTILE_SECRET_KEY 10 "${TURNSTILE_SECRET_KEY:-}"
  echo "[ensure-secrets] Turnstile enabled on worker"
}

ensure_turnstile

enable_client_security() {
  local want="${CLIENT_SECURITY_ENABLED:-true}"
  if [[ "${want,,}" != "true" ]]; then
    echo "[ensure-secrets] CLIENT_SECURITY_ENABLED=$want，保持关闭"
    return 0
  fi
  patch_env_remote "$REMOTE" "$ENV_REL" "CLIENT_SECURITY_ENABLED" "true"
  patch_env_remote "$REMOTE" "$ENV_REL" "CLIENT_SECURITY_AES_REQUIRED" "true"
  patch_env_remote "$REMOTE" "$ENV_REL" "CLIENT_SECURITY_ROUTE_OBFUSCATION" "true"
  patch_env_remote "$REMOTE" "$ENV_REL" "CLIENT_SECURITY_FIELD_ENCRYPTION" "true"
  patch_env_remote "$REMOTE" "$ENV_REL" "CLIENT_SECURITY_ENCRYPT_STREAM" "true"
  echo "[ensure-secrets] client security flags → true"
}

enable_client_security
echo "[ensure-secrets] done"
