#!/usr/bin/env bash
# 一次性：MW entry-nginx + Worker frontend 增加 location /g/ → Gateway
# （docker cp 覆盖 busy 文件时先 stop 容器）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$SCRIPT_DIR/../docker/.env.split}"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"
[[ -f "$SPLIT_ENV" ]] && source "$SPLIT_ENV"
: "${MW_HOST:?}"

MW_SSH="${MW_SSH:-root@${MW_HOST}}"
WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"

G_BLOCK='
    location /g/ {
        proxy_pass PROXY;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }
'

patch_container() {
  local ssh_target="$1"
  local proxy_pass="$2"
  local block
  block="${G_BLOCK//PROXY/$proxy_pass}"
  deploy_ssh "$ssh_target" bash -s <<EOF
set -euo pipefail
for cid in \$(docker ps -q); do
  docker exec "\$cid" test -f /etc/nginx/conf.d/default.conf 2>/dev/null || continue
  docker exec "\$cid" grep -q 'location /api/' /etc/nginx/conf.d/default.conf 2>/dev/null || continue
  docker exec "\$cid" grep -q 'location /g/' /etc/nginx/conf.d/default.conf 2>/dev/null && echo "[ok] already patched \$cid" && continue
  docker cp "\$cid:/etc/nginx/conf.d/default.conf" /tmp/ng-in.conf
  awk '/location \\/api\\//{print block; print; next} {print}' block='$block' /tmp/ng-in.conf > /tmp/ng-out.conf
  docker stop "\$cid"
  docker cp /tmp/ng-out.conf "\$cid:/etc/nginx/conf.d/default.conf"
  docker start "\$cid"
  echo "[ok] patched and restarted \$cid"
done
EOF
}

echo "[nginx] MW ..."
patch_container "$MW_SSH" "http://agent-gateway:8080"
echo "[nginx] Worker ..."
patch_container "$WORKER_SSH" "http://${MW_HOST}:8080"
echo "[nginx] 完成"
