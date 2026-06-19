#!/usr/bin/env bash
# 在 MW 上执行：安装 Docker、同步 python-ai、构建启动 python-ai-cn
set -eu

CN_HOST="${CN_HOST:-118.89.123.201}"
WORKER_HOST="${WORKER_HOST:-47.80.80.224}"
CN_DIR="/opt/novel-agent"
DOCKER_DIR="$CN_DIR/legacy/novel-agent/agent-document/docs/deploy/docker"

ssh_cn() { ssh -o BatchMode=yes -o ConnectTimeout=30 "root@${CN_HOST}" "$@"; }

echo "[cn-deploy] 安装 Docker ..."
ssh_cn bash -s <<'EOS'
set -eu
if command -v docker >/dev/null 2>&1; then
  docker --version
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

echo "[cn-deploy] 配置 Docker 镜像加速 ..."
ssh_cn bash -s <<'EOS'
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
docker info 2>/dev/null | sed -n '/Registry Mirrors/,/^[^ ]/p' | head -6
EOS

echo "[cn-deploy] 同步 python-ai 源码 ..."
ssh_cn "mkdir -p $CN_DIR/python-ai $DOCKER_DIR"
ssh -o BatchMode=yes "root@${WORKER_HOST}" "tar czf - -C /opt/novel-agent python-ai/.env python-ai/app python-ai/requirements.txt" \
  | ssh_cn "tar xzf - -C $CN_DIR"

echo "[cn-deploy] 写入 compose ..."
ssh_cn "cat > $DOCKER_DIR/docker-compose.cn.yml" <<'YAML'
name: novel-agent-cn
services:
  python-ai-cn:
    build:
      context: /opt/novel-agent
      dockerfile: legacy/novel-agent/agent-document/docs/deploy/docker/Dockerfile.python-ai
    image: novel-agent/python-ai:latest
    restart: unless-stopped
    env_file:
      - /opt/novel-agent/python-ai/.env
    environment:
      LOG_LEVEL: INFO
      CONTENT_BASE_URL: http://10.66.0.3:8091
    mem_limit: 768m
    ports:
      - "10.66.0.1:8000:8000"
    networks:
      - cn-net
networks:
  cn-net:
    driver: bridge
YAML

ssh_cn "mkdir -p $CN_DIR/legacy/novel-agent/agent-document/docs/deploy/docker"
scp -o BatchMode=yes /opt/novel-agent/legacy/novel-agent/agent-document/docs/deploy/docker/Dockerfile.python-ai \
  "root@${CN_HOST}:$DOCKER_DIR/Dockerfile.python-ai" 2>/dev/null || \
ssh -o BatchMode=yes "root@${WORKER_HOST}" "cat /opt/novel-agent/legacy/novel-agent/agent-document/docs/deploy/docker/Dockerfile.python-ai" \
  | ssh_cn "cat > $DOCKER_DIR/Dockerfile.python-ai"

echo "[cn-deploy] 构建 python-ai-cn（首次约 5~15 分钟）..."
ssh_cn bash -s <<EOS
set -eu
cd $CN_DIR
CF=$DOCKER_DIR/docker-compose.cn.yml
COMPOSE="docker compose"
\$COMPOSE -f "\$CF" build python-ai-cn
\$COMPOSE -f "\$CF" up -d python-ai-cn
sleep 8
curl -sf http://10.66.0.1:8000/api/health && echo " python-ai-cn health OK"
EOS

echo "[cn-deploy] 完成"
