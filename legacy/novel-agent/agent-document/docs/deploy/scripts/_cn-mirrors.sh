#!/usr/bin/env bash
# 国内节点常用镜像（CN 优先，GitHub 直连放最后）
# source _cn-mirrors.sh

# mihomo 发行包下载 URL 列表（每行一个，国内镜像优先）
mihomo_release_urls() {
  local ver="${1:-v1.19.12}"
  local file="mihomo-linux-amd64-${ver}.gz"
  local base="https://github.com/MetaCubeX/mihomo/releases/download/${ver}/${file}"
  printf '%s\n' \
    "https://ghfast.top/${base}" \
    "https://mirror.ghproxy.com/${base}" \
    "https://gh-proxy.com/${base}" \
    "https://ghps.cc/${base}" \
    "https://gitclone.com/github.com/MetaCubeX/mihomo/releases/download/${ver}/${file}" \
    "${base}"
}

# Docker daemon.json（仅腾讯云，避免 daocloud 401）
cn_docker_daemon_json() {
  cat <<'JSON'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com"
  ],
  "max-concurrent-downloads": 10,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
JSON
}

# pip / apt 环境变量（写入 Dockerfile 或 export）
CN_PIP_INDEX="https://pypi.tuna.tsinghua.edu.cn/simple"
CN_APT_MIRROR="mirrors.tencent.com"
