#!/usr/bin/env bash
# 从 MW 向国内机注入 SSH 公钥（需 sshpass）
set -eu
CN_HOST="${CN_HOST:-118.89.123.201}"
CN_ROOT_PASSWORD="${CN_ROOT_PASSWORD:?CN_ROOT_PASSWORD required}"

LOCAL_PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB0zI5dIBCP3l4PBhvCVntSIfZQc2up+c6RafXOoAXAw JZJ@JZJ-127626-W'
MW_PUB="$(cat /root/.ssh/id_ed25519.pub 2>/dev/null || true)"
WK_PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILWXqaG5ReIyx3pVIrmW62IDZ9UmlJ6w1Jao+GWdxUNH root@iZ5tsdlvjgdzv5xw4aclpnZ'

remote_cmd() {
  sshpass -p "$CN_ROOT_PASSWORD" ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 \
    "root@${CN_HOST}" "$@"
}

remote_cmd "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
remote_cmd "grep -qF '${LOCAL_PUB}' ~/.ssh/authorized_keys || echo '${LOCAL_PUB}' >> ~/.ssh/authorized_keys"
if [[ -n "$MW_PUB" ]]; then
  remote_cmd "grep -qF '${MW_PUB}' ~/.ssh/authorized_keys || echo '${MW_PUB}' >> ~/.ssh/authorized_keys"
fi
remote_cmd "grep -qF '${WK_PUB}' ~/.ssh/authorized_keys || echo '${WK_PUB}' >> ~/.ssh/authorized_keys"
remote_cmd "wc -l ~/.ssh/authorized_keys && echo CN_SSH_BOOTSTRAP_OK"
