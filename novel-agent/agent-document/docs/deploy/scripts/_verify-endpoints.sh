#!/usr/bin/env bash
check() {
  local url="$1"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 "$url" 2>/dev/null || echo ERR)
  echo "$url -> HTTP $code"
}
check http://107.150.112.140:8080
check http://107.150.112.140:8081
check http://107.150.112.140:8000/api/health
check http://47.80.80.224:3000
check http://47.80.80.224:8091
check http://47.80.80.224:8082
