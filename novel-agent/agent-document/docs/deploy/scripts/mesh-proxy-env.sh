#!/usr/bin/env bash
# 三机经 Worker Mihomo(Clash) 加速外网：WireGuard 10.66.0.3:7890
# 用法: source mesh-proxy-env.sh && apply_mesh_proxy
# 环境变量可覆盖: WORKER_WG_IP MIHOMO_PORT DEPLOY_NO_PROXY

WORKER_WG_IP="${WORKER_WG_IP:-10.66.0.3}"
MIHOMO_PORT="${MIHOMO_PORT:-7890}"
MESH_HTTP_PROXY="${MESH_HTTP_PROXY:-http://${WORKER_WG_IP}:${MIHOMO_PORT}}"

apply_mesh_proxy() {
  local proxy="$MESH_HTTP_PROXY"
  export http_proxy="$proxy" https_proxy="$proxy"
  export HTTP_PROXY="$proxy" HTTPS_PROXY="$proxy"
  export ALL_PROXY="$proxy"
  local noproxy="${DEPLOY_NO_PROXY:-127.0.0.1,localhost,10.66.0.0/24,107.150.112.140,47.80.80.224,118.89.123.201}"
  export no_proxy="$noproxy" NO_PROXY="$noproxy"

  if command -v git >/dev/null 2>&1; then
    git config --global http.proxy "$proxy" 2>/dev/null || true
    git config --global https.proxy "$proxy" 2>/dev/null || true
  fi

  _ensure_proxy_cmd() {
    if command -v nc >/dev/null 2>&1; then return 0; fi
    if command -v ncat >/dev/null 2>&1; then return 0; fi
    if command -v connect >/dev/null 2>&1; then return 0; fi
    if command -v dnf >/dev/null 2>&1; then
      dnf install -y -q nc nmap-ncat 2>/dev/null || dnf install -y -q nmap-ncat 2>/dev/null || true
    elif command -v yum >/dev/null 2>&1; then
      yum install -y -q nc nmap-ncat 2>/dev/null || true
    elif command -v apt-get >/dev/null 2>&1; then
      apt-get update -qq && apt-get install -y -qq netcat-openbsd 2>/dev/null || true
    fi
  }
  _ensure_proxy_cmd

  local proxy_cmd=""
  if command -v nc >/dev/null 2>&1; then
    proxy_cmd="nc -X connect -x ${WORKER_WG_IP}:${MIHOMO_PORT} %h %p"
  elif command -v ncat >/dev/null 2>&1; then
    proxy_cmd="ncat --proxy ${WORKER_WG_IP}:${MIHOMO_PORT} --proxy-type http %h %p"
  elif command -v connect >/dev/null 2>&1; then
    proxy_cmd="connect -H ${WORKER_WG_IP}:${MIHOMO_PORT} %h %p"
  fi

  mkdir -p ~/.ssh
  chmod 700 ~/.ssh
  if [[ -n "$proxy_cmd" ]]; then
    grep -q '^Host github.com' ~/.ssh/config 2>/dev/null || cat >> ~/.ssh/config <<CFG

Host github.com
  ProxyCommand ${proxy_cmd}
CFG
    chmod 600 ~/.ssh/config
  else
    echo "WARN: 无法配置 github SSH 代理（缺少 nc/ncat）" >&2
  fi
  ssh-keyscan -H github.com 2>/dev/null >> ~/.ssh/known_hosts || true
}

probe_mesh_proxy() {
  local label="${1:-proxy}"
  echo "[$label] 探测 $MESH_HTTP_PROXY ..."
  if curl -fsS -x "$MESH_HTTP_PROXY" --max-time 20 https://api.ip.sb/ip; then
    echo " [$label] OK"
    return 0
  fi
  echo " [$label] FAIL" >&2
  return 1
}

apply_docker_build_proxy() {
  mkdir -p /etc/systemd/system/docker.service.d
  cat > /etc/systemd/system/docker.service.d/http-proxy.conf <<EOF
[Service]
Environment="HTTP_PROXY=${MESH_HTTP_PROXY}"
Environment="HTTPS_PROXY=${MESH_HTTP_PROXY}"
Environment="NO_PROXY=${no_proxy:-127.0.0.1,localhost,10.66.0.0/24}"
EOF
  systemctl daemon-reload
  systemctl restart docker
  sleep 2
}
