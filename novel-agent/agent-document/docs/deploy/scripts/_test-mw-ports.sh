#!/usr/bin/env bash
for port in 8848 9848 5432 6379; do
  if bash -c "echo >/dev/tcp/107.150.112.140/${port}" 2>/dev/null; then
    echo "${port} OK"
  else
    echo "${port} FAIL"
  fi
done
