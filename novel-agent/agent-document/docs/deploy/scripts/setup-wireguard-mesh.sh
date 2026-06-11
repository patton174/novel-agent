#!/usr/bin/env bash
# 三机 WireGuard：CN hub（10.66.0.1 爬虫）+ MW↔Worker 直连（业务 API，低延迟）
# 勿再用星型 AllowedIPs=10.66.0.0/24 全走 CN，否则 MW↔Worker ~540ms
# 在 MW 上执行（可 SSH 到 CN / Worker）：
#   CN_HOST=118.89.123.201 MW_HOST=107.150.112.140 WORKER_HOST=47.80.80.224 bash setup-wireguard-mesh.sh
set -eu

CN_HOST="${CN_HOST:-118.89.123.201}"
MW_HOST="${MW_HOST:-107.150.112.140}"
WORKER_HOST="${WORKER_HOST:-47.80.80.224}"
WG_PORT="${WG_PORT:-51820}"
WG_NET="10.66.0"
MW_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"

ssh_cn() { ssh -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new "root@${CN_HOST}" "$@"; }
ssh_wk() { ssh -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new "root@${WORKER_HOST}" "$@"; }

is_mw_host() {
  local host="$1"
  [[ "$host" == "$MW_HOST" || "$host" == "$MW_IP" || "$host" == "127.0.0.1" ]]
}

run_on() {
  local host="$1"
  shift
  if is_mw_host "$host"; then
    bash -c "$*"
  else
    ssh -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new "root@${host}" "$@"
  fi
}

install_wg_packages() {
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq wireguard wireguard-tools iproute2 iputils-ping >/dev/null
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y -q wireguard-tools iproute iputils >/dev/null 2>&1 || yum install -y -q wireguard-tools iproute iputils >/dev/null
  elif command -v yum >/dev/null 2>&1; then
    yum install -y -q wireguard-tools iproute iputils >/dev/null
  else
    echo "[wg] ERROR: no supported package manager" >&2
    exit 1
  fi
}

ensure_wg_local() {
  install_wg_packages
  mkdir -p /etc/wireguard
  chmod 700 /etc/wireguard
  if [[ ! -f /etc/wireguard/privatekey ]]; then
    wg genkey | tee /etc/wireguard/privatekey | wg pubkey > /etc/wireguard/publickey
    chmod 600 /etc/wireguard/privatekey
  fi
}

ensure_wg_remote() {
  local host="$1"
  ssh -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new "root@${host}" bash -s <<'EOS'
set -eu
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq wireguard wireguard-tools iproute2 iputils-ping >/dev/null
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y -q wireguard-tools iproute iputils >/dev/null 2>&1 || yum install -y -q wireguard-tools iproute iputils >/dev/null
elif command -v yum >/dev/null 2>&1; then
  yum install -y -q wireguard-tools iproute iputils >/dev/null
else
  echo "[wg] ERROR: no supported package manager" >&2
  exit 1
fi
mkdir -p /etc/wireguard
chmod 700 /etc/wireguard
if [[ ! -f /etc/wireguard/privatekey ]]; then
  wg genkey | tee /etc/wireguard/privatekey | wg pubkey > /etc/wireguard/publickey
  chmod 600 /etc/wireguard/privatekey
fi
EOS
}

pubkey() {
  local host="$1"
  if is_mw_host "$host"; then
    cat /etc/wireguard/publickey
  else
    ssh -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new "root@${host}" "cat /etc/wireguard/publickey"
  fi
}

privkey() {
  local host="$1"
  if is_mw_host "$host"; then
    cat /etc/wireguard/privatekey
  else
    ssh -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new "root@${host}" "cat /etc/wireguard/privatekey"
  fi
}

write_cn_config() {
  local mw_pub="$1" wk_pub="$2" cn_priv="$3"
  ssh_cn "cat > /etc/wireguard/wg0.conf <<EOF
[Interface]
Address = ${WG_NET}.1/24
ListenPort = ${WG_PORT}
PrivateKey = ${cn_priv}
PostUp = sysctl -w net.ipv4.ip_forward=1
PostDown = sysctl -w net.ipv4.ip_forward=0

[Peer]
# MW
PublicKey = ${mw_pub}
AllowedIPs = ${WG_NET}.2/32

[Peer]
# Worker
PublicKey = ${wk_pub}
AllowedIPs = ${WG_NET}.3/32
EOF
chmod 600 /etc/wireguard/wg0.conf"
}

write_client_config() {
  local role="$1" addr="$2" hub_pub="$3" client_priv="$4" cn_host="$5"
  local other_pub="$6" other_ep="$7" other_ip="$8" listen_port="$9"
  local host="$MW_HOST"
  [[ "$role" == "worker" ]] && host="$WORKER_HOST"
  local conf
  conf="[Interface]
Address = ${addr}/24
PrivateKey = ${client_priv}
ListenPort = ${listen_port}

[Peer]
# CN hub（仅爬虫）
PublicKey = ${hub_pub}
Endpoint = ${cn_host}:${WG_PORT}
AllowedIPs = ${WG_NET}.1/32
PersistentKeepalive = 25

[Peer]
# MW/Worker 直连
PublicKey = ${other_pub}
Endpoint = ${other_ep}
AllowedIPs = ${other_ip}/32
PersistentKeepalive = 25
"
  if is_mw_host "$host"; then
    printf '%s' "$conf" > /etc/wireguard/wg0.conf
    chmod 600 /etc/wireguard/wg0.conf
  else
    ssh -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new "root@${host}" "cat > /etc/wireguard/wg0.conf" <<EOF
$conf
EOF
    ssh -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new "root@${host}" "chmod 600 /etc/wireguard/wg0.conf"
  fi
}

enable_wg() {
  local host="$1"
  if is_mw_host "$host"; then
    systemctl enable wg-quick@wg0 2>/dev/null || true
    wg-quick down wg0 2>/dev/null || true
    wg-quick up wg0
    systemctl enable wg-quick@wg0
  else
    ssh -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new "root@${host}" "
      systemctl enable wg-quick@wg0 2>/dev/null || true
      wg-quick down wg0 2>/dev/null || true
      wg-quick up wg0
      systemctl enable wg-quick@wg0
    "
  fi
}

echo "[wg] 安装 WireGuard ..."
ssh-keyscan -H "$CN_HOST" "$WORKER_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true
ensure_wg_local
ensure_wg_remote "$CN_HOST"
ensure_wg_remote "$WORKER_HOST"

MW_PUB="$(pubkey "$MW_HOST")"
WK_PUB="$(pubkey "$WORKER_HOST")"
CN_PUB="$(pubkey "$CN_HOST")"
CN_PRIV="$(privkey "$CN_HOST")"
MW_PRIV="$(privkey "$MW_HOST")"
WK_PRIV="$(privkey "$WORKER_HOST")"

echo "[wg] 写入配置 ..."
write_cn_config "$MW_PUB" "$WK_PUB" "$CN_PRIV"
write_client_config "mw" "${WG_NET}.2" "$CN_PUB" "$MW_PRIV" "$CN_HOST" "$WK_PUB" "${WORKER_HOST}:51821" "${WG_NET}.3" "51822"
write_client_config "worker" "${WG_NET}.3" "$CN_PUB" "$WK_PRIV" "$CN_HOST" "$MW_PUB" "${MW_HOST}:51822" "${WG_NET}.2" "51821"

echo "[wg] 启动隧道 ..."
enable_wg "$CN_HOST"
enable_wg "$MW_HOST"
enable_wg "$WORKER_HOST"

echo "[wg] 连通性 ..."
sleep 2
ssh_cn "ping -c 2 -W 2 ${WG_NET}.2 && ping -c 2 -W 2 ${WG_NET}.3"
if is_mw_host "$MW_HOST"; then
  ping -c 2 -W 2 ${WG_NET}.1
else
  ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new "root@${MW_HOST}" "ping -c 2 -W 2 ${WG_NET}.1"
fi
ssh_wk "ping -c 2 -W 2 ${WG_NET}.1"
echo "[wg] WireGuard mesh OK (${WG_NET}.1=CN ${WG_NET}.2=MW ${WG_NET}.3=Worker)"
