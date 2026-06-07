#!/usr/bin/env bash
for c in novel-agent-worker-agent-pyai-1 novel-agent-worker-agent-consumer-1 novel-agent-mw-agent-gateway-1; do
  echo "======== $c ========"
  docker logs "$c" 2>&1 | grep -iE 'Started |register finished|APPLICATION FAILED|Error' | tail -5
done
