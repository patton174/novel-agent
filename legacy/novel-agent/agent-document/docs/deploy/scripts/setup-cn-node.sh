#!/usr/bin/env bash
# 国内节点初始化：Docker + python-ai-cn +（可选）WireGuard
# 用法（本机，经 MW 跳转）：
#   bash setup-cn-node.sh
# 或 MW 上：
#   CN_HOST=118.89.123.201 WORKER_HOST=47.80.80.224 bash setup-cn-node.sh --local
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/../docker" && pwd)"
SPLIT_ENV="${DEPLOY_SPLIT_ENV:-$DEPLOY_DIR/.env.split}"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_deploy-lib.sh"

RUN_LOCAL=false
SKIP_WG=false
for arg in "$@"; do
  case "$arg" in
    --local) RUN_LOCAL=true ;;
    --skip-wg) SKIP_WG=true ;;
  esac
done

if [[ -f "$SPLIT_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$SPLIT_ENV"
  set +a
fi

CN_HOST="${CN_HOST:-118.89.123.201}"
CN_SSH="${CN_SSH:-root@${CN_HOST}}"
MW_HOST="${MW_HOST:-107.150.112.140}"
MW_SSH="${MW_SSH:-root@${MW_HOST}}"
WORKER_HOST="${WORKER_HOST:-47.80.80.224}"
WORKER_SSH="${WORKER_SSH:-root@${WORKER_HOST}}"
CN_DIR="${CN_REMOTE_DIR:-/opt/novel-agent}"
DOCKER_DIR="$CN_DIR/legacy/novel-agent/agent-document/docs/deploy/docker"

run_on_cn() {
  deploy_ssh "$MW_SSH" ssh -o BatchMode=yes -o ConnectTimeout=25 "root@${CN_HOST}" bash -s
}

echo "[cn] CN=$CN_HOST via MW=$MW_HOST"

if ! $SKIP_WG; then
  echo "[cn] WireGuard mesh ..."
  if $RUN_LOCAL; then
    bash "$SCRIPT_DIR/setup-wireguard-mesh.sh"
  else
    deploy_scp "$SCRIPT_DIR/setup-wireguard-mesh.sh" "$MW_SSH:/tmp/setup-wireguard-mesh.sh"
    deploy_ssh "$MW_SSH" "sed -i 's/\r$//' /tmp/setup-wireguard-mesh.sh; chmod +x /tmp/setup-wireguard-mesh.sh; CN_HOST='$CN_HOST' MW_HOST='$MW_HOST' WORKER_HOST='$WORKER_HOST' bash /tmp/setup-wireguard-mesh.sh"
  fi
fi

echo "[cn] 安装 Docker ..."
run_on_cn <<'EOS'
set -eu
if command -v docker >/dev/null 2>&1; then
  echo docker already installed
  exit 0
fi
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable docker
systemctl start docker
docker --version
EOS

echo "[cn] 同步 python-ai 与 compose ..."
deploy_ssh "$MW_SSH" "ssh -o BatchMode=yes root@${CN_HOST} 'mkdir -p ${CN_DIR}/legacy/novel-agent/agent-document/docs/deploy/docker ${CN_DIR}/python-ai'"
deploy_ssh "$WORKER_SSH" "tar czf - -C /opt/novel-agent python-ai/.env python-ai/app python-ai/requirements.txt 2>/dev/null" | \
  deploy_ssh "$MW_SSH" "ssh -o BatchMode=yes root@${CN_HOST} 'tar xzf - -C ${CN_DIR}'"

deploy_scp "$DEPLOY_DIR/docker-compose.cn.yml" "$MW_SSH:/tmp/docker-compose.cn.yml"
deploy_scp "$DEPLOY_DIR/Dockerfile.python-ai" "$MW_SSH:/tmp/Dockerfile.python-ai.cn"
deploy_ssh "$MW_SSH" "scp -o BatchMode=yes /tmp/docker-compose.cn.yml root@${CN_HOST}:${DOCKER_DIR}/docker-compose.cn.yml; scp -o BatchMode=yes /tmp/Dockerfile.python-ai.cn root@${CN_HOST}:${DOCKER_DIR}/Dockerfile.python-ai"

echo "[cn] 构建并启动 python-ai-cn（首次较慢）..."
run_on_cn <<EOS
set -eu
cd ${CN_DIR}
CF=${DOCKER_DIR}/docker-compose.cn.yml
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then COMPOSE="docker-compose"; fi
\$COMPOSE -f "\$CF" build python-ai-cn
\$COMPOSE -f "\$CF" up -d python-ai-cn
sleep 5
curl -sf http://10.66.0.1:8000/api/health && echo " python-ai-cn OK"
EOS

echo "[cn] 完成。Worker 可通过 http://10.66.0.1:8000 调用国内爬虫实例。"
