#!/usr/bin/env bash
set -eu
DD=/opt/novel-agent/legacy/novel-agent/agent-document/docs/deploy/docker
cp /tmp/nginx-cloudflare-realip.conf "$DD/"
cp /tmp/docker-compose.mw.yml "$DD/"
export WORKER_HOST=47.80.80.224
export DOMAIN=www.novel-agent.cn
export DOMAIN_ALIASES=""
export CERT_NAME=www.novel-agent.cn
envsubst '${WORKER_HOST} ${DOMAIN} ${DOMAIN_ALIASES} ${CERT_NAME}' \
  < /tmp/nginx-entry-mw-ssl.conf.template > "$DD/nginx-entry-mw.conf"
cd /opt/novel-agent
COMPOSE="docker compose"
$COMPOSE -f "$DD/docker-compose.mw.yml" --env-file "$DD/.env.mw" up -d entry-nginx
$COMPOSE -f "$DD/docker-compose.mw.yml" --env-file "$DD/.env.mw" restart entry-nginx
$COMPOSE -f "$DD/docker-compose.mw.yml" --env-file "$DD/.env.mw" exec -T entry-nginx nginx -t
echo CF_NGINX_OK
