#!/usr/bin/env bash
# 国内节点 Docker 镜像加速（腾讯云优先）
# 在 MW 上执行：bash configure-cn-docker-mirror.sh
# 在国内机本机：bash configure-cn-docker-mirror.sh --local
set -eu

CN_HOST="${CN_HOST:-118.89.123.201}"

apply_mirror() {
  mkdir -p /etc/docker
  cat > /etc/docker/daemon.json <<'JSON'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run"
  ],
  "max-concurrent-downloads": 10,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
JSON
  systemctl daemon-reload
  systemctl restart docker
  sleep 2
  echo "[mirror] registry-mirrors:"
  docker info 2>/dev/null | sed -n '/Registry Mirrors/,/^[^ ]/p' | head -8
  echo "[mirror] 测试拉取 python:3.12-slim ..."
  docker pull python:3.12-slim
  echo MIRROR_OK
}

if [[ "${1:-}" == "--local" ]]; then
  apply_mirror
else
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck source=/dev/null
  source "${SCRIPT_DIR}/_deploy-lib.sh" 2>/dev/null || true
  MW_SSH="${MW_SSH:-root@107.150.112.140}"
  deploy_ssh "$MW_SSH" "ssh-keyscan -H ${CN_HOST} >> ~/.ssh/known_hosts 2>/dev/null || true; ssh -o BatchMode=yes root@${CN_HOST} bash -s" <<'REMOTE'
set -eu
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'JSON'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run"
  ],
  "max-concurrent-downloads": 10,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
JSON
systemctl daemon-reload
systemctl restart docker
sleep 2
docker info 2>/dev/null | sed -n '/Registry Mirrors/,/^[^ ]/p' | head -8
echo "[mirror] pull python:3.12-slim ..."
docker pull python:3.12-slim
echo MIRROR_OK
REMOTE
fi
