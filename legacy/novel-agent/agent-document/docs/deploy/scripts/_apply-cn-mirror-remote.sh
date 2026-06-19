#!/usr/bin/env bash
set -eu
ssh-keyscan -H 118.89.123.201 >> ~/.ssh/known_hosts 2>/dev/null || true
ssh -o BatchMode=yes root@118.89.123.201 bash -s <<'EOS'
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
EOS
