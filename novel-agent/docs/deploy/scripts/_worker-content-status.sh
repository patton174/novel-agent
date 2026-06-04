#!/usr/bin/env bash
docker ps -a --filter name=agent-content
echo "=== LOGS ==="
docker logs novel-agent-worker-agent-content-1 --tail 40 2>&1
