#!/usr/bin/env bash
# 在 jump 主机执行：docker save → 传输（ASCII 进度条）→ docker load
# 用法:
#   bash docker-image-transfer.sh <src_ssh> local - <image> <label>
#   bash docker-image-transfer.sh <src_ssh> remote <dst_ssh> <image> <label>
set -eu
SRC="${1:?src ssh}"
DST_MODE="${2:?local|remote}"
DST_SPEC="${3:--}"
IMG="${4:?image}"
LABEL="${5:-transfer}"

if [[ "$DST_MODE" == "local" ]]; then
  DST_SPEC=""
elif [[ -z "$DST_SPEC" || "$DST_SPEC" == "-" ]]; then
  echo "ERROR: remote 模式需要 dst_ssh" >&2
  exit 1
fi

SAFE_LABEL="${LABEL//[^a-zA-Z0-9]/_}"
TMP="/tmp/novel-agent-xfer-${SAFE_LABEL}.tar.gz"
TMP_PART="${TMP}.part"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=30)
BAR_WIDTH=36

rssh() { ssh "${SSH_OPTS[@]}" "$@"; }

human_bytes() {
  local b="${1:-0}"
  if command -v numfmt >/dev/null 2>&1; then
    numfmt --to=iec-i --suffix=B "$b" 2>/dev/null || echo "${b}B"
  elif [[ "$b" -ge 1073741824 ]]; then
    awk "BEGIN { printf \"%.1fGiB\", $b/1073741824 }"
  elif [[ "$b" -ge 1048576 ]]; then
    awk "BEGIN { printf \"%.1fMiB\", $b/1048576 }"
  elif [[ "$b" -ge 1024 ]]; then
    awk "BEGIN { printf \"%.1fKiB\", $b/1024 }"
  else
    echo "${b}B"
  fi
}

draw_bar() {
  local cur="$1" total="$2" phase="$3"
  local pct=0 filled=0 empty=0 bar="" i
  if [[ "$total" -gt 0 ]]; then
    pct=$(( cur * 100 / total ))
    [[ "$pct" -gt 100 ]] && pct=100
  fi
  filled=$(( pct * BAR_WIDTH / 100 ))
  empty=$(( BAR_WIDTH - filled ))
  for ((i = 0; i < filled; i++)); do bar+="#"; done
  for ((i = 0; i < empty; i++)); do bar+="."; done
  if [[ "$total" -gt 0 ]]; then
    printf "[%s] %s [%s] [%s] %3d%% %s / %s\n" \
      "$(date +%H:%M:%S)" "$LABEL" "$phase" "$bar" "$pct" \
      "$(human_bytes "$cur")" "$(human_bytes "$total")"
  else
    printf "[%s] %s [%s] [%s] ---- %s\n" \
      "$(date +%H:%M:%S)" "$LABEL" "$phase" "$bar" "$(human_bytes "$cur")"
  fi
}

echo "[$(date +%H:%M:%S)] $LABEL: [1/3] 源机导出 $IMG ($SRC) ..."
rssh "$SRC" "rm -f '$TMP' '$TMP_PART'"

(
  while true; do
    sz=$(rssh "$SRC" "stat -c%s '$TMP_PART' 2>/dev/null || stat -c%s '$TMP' 2>/dev/null || echo 0")
    draw_bar "$sz" 0 "1/3 导出"
    sleep 3
  done
) &
monitor_pid=$!

if ! rssh "$SRC" "docker save '$IMG' | gzip -1 > '$TMP_PART' && mv '$TMP_PART' '$TMP'"; then
  kill "$monitor_pid" 2>/dev/null || true
  wait "$monitor_pid" 2>/dev/null || true
  echo "[$(date +%H:%M:%S)] $LABEL: ERROR docker save 失败" >&2
  exit 1
fi
kill "$monitor_pid" 2>/dev/null || true
wait "$monitor_pid" 2>/dev/null || true

total=$(rssh "$SRC" "stat -c%s '$TMP'")
if [[ "$total" -le 0 ]]; then
  echo "[$(date +%H:%M:%S)] $LABEL: ERROR 导出文件为空" >&2
  exit 1
fi
echo "[$(date +%H:%M:%S)] $LABEL: [1/3] 导出完成 $(human_bytes "$total")"

echo "[$(date +%H:%M:%S)] $LABEL: [2/3] 传输 $(human_bytes "$total") ..."

if command -v rsync >/dev/null 2>&1 && rssh "$SRC" "command -v rsync >/dev/null 2>&1"; then
  if [[ "$DST_MODE" == "local" ]]; then
    echo "[$(date +%H:%M:%S)] $LABEL: [2/3] rsync → 本机"
    rsync -av --info=progress2 -e "ssh ${SSH_OPTS[*]}" "${SRC}:${TMP}" "${TMP}"
  elif rssh "$DST_SPEC" "command -v rsync >/dev/null 2>&1"; then
    echo "[$(date +%H:%M:%S)] $LABEL: [2/3] rsync → $DST_SPEC"
    rsync -av --info=progress2 -e "ssh ${SSH_OPTS[*]}" "${SRC}:${TMP}" "${DST_SPEC}:${TMP}"
  else
    echo "[$(date +%H:%M:%S)] $LABEL: [2/3] 流式传输 → $DST_SPEC"
    rssh "$DST_SPEC" "rm -f '$TMP' '$TMP.part'"
    (
      while true; do
        cur=$(rssh "$DST_SPEC" "stat -c%s '$TMP.part' 2>/dev/null || echo 0")
        draw_bar "$cur" "$total" "2/3 传输"
        sleep 3
      done
    ) &
    mon_pid=$!
    rssh "$SRC" "cat '$TMP'" | rssh "$DST_SPEC" "tee '$TMP.part' > /dev/null && mv '$TMP.part' '$TMP'"
    kill "$mon_pid" 2>/dev/null || true
    wait "$mon_pid" 2>/dev/null || true
  fi
else
  echo "[$(date +%H:%M:%S)] $LABEL: [2/3] 流式传输"
  if [[ "$DST_MODE" == "local" ]]; then
    rm -f "$TMP.part"
    (
      while true; do
        cur=$(stat -c%s "$TMP.part" 2>/dev/null || echo 0)
        draw_bar "$cur" "$total" "2/3 传输"
        sleep 3
      done
    ) &
    mon_pid=$!
    rssh "$SRC" "cat '$TMP'" > "$TMP.part"
    kill "$mon_pid" 2>/dev/null || true
    wait "$mon_pid" 2>/dev/null || true
    mv "$TMP.part" "$TMP"
  else
    rssh "$DST_SPEC" "rm -f '$TMP' '$TMP.part'"
    (
      while true; do
        cur=$(rssh "$DST_SPEC" "stat -c%s '$TMP.part' 2>/dev/null || echo 0")
        draw_bar "$cur" "$total" "2/3 传输"
        sleep 3
      done
    ) &
    mon_pid=$!
    rssh "$SRC" "cat '$TMP'" | rssh "$DST_SPEC" "tee '$TMP.part' > /dev/null && mv '$TMP.part' '$TMP'"
    kill "$mon_pid" 2>/dev/null || true
    wait "$mon_pid" 2>/dev/null || true
  fi
fi

echo "[$(date +%H:%M:%S)] $LABEL: [3/3] docker load ..."
if [[ "$DST_MODE" == "local" ]]; then
  gunzip -c "$TMP" | docker load
  rm -f "$TMP"
  docker image inspect "$IMG" >/dev/null
else
  rssh "$DST_SPEC" "gunzip -c '$TMP' | docker load && rm -f '$TMP'"
  rssh "$DST_SPEC" "docker image inspect '$IMG'" >/dev/null
fi
rssh "$SRC" "rm -f '$TMP' '$TMP_PART'"
echo "[$(date +%H:%M:%S)] $LABEL: 全部完成 ✓"
