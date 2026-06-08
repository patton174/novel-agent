#!/usr/bin/env python3
"""One-off: publish agent-gateway.yaml with billing route to Nacos."""
from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        out[key] = value
    return out


def main() -> int:
    env_path = Path("/opt/novel-agent/novel-agent/agent-document/docs/deploy/docker/.env.mw")
    template = Path("/tmp/agent-gateway.yaml")
    if len(sys.argv) >= 3:
        env_path = Path(sys.argv[1])
        template = Path(sys.argv[2])
    env = load_env(env_path)
    content = template.read_text(encoding="utf-8")
    content = content.replace("YOUR_MW_HOST", env["MW_HOST"]).replace(
        "YOUR_REDIS_PASSWORD", env["SPRING_DATA_REDIS_PASSWORD"]
    )
    base = f"http://{env['NACOS_SERVER_ADDR']}"
    login_body = urllib.parse.urlencode(
        {"username": env["NACOS_USERNAME"], "password": env["NACOS_PASSWORD"]}
    ).encode()
    req = urllib.request.Request(f"{base}/nacos/v1/auth/login", data=login_body, method="POST")
    with urllib.request.urlopen(req, timeout=20) as resp:
        token = json.load(resp)["accessToken"]
    for data_id in ("agent-gateway.yaml", "agent-gateway-dev.yaml"):
        payload = urllib.parse.urlencode(
            {
                "dataId": data_id,
                "groupName": "NOVEL_AGENT_GROUP",
                "namespaceId": env["NACOS_NAMESPACE"],
                "type": "yaml",
                "content": content,
                "accessToken": token,
            }
        ).encode()
        req = urllib.request.Request(f"{base}/nacos/v3/admin/cs/config", data=payload, method="POST")
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode()[:200]
            print(f"{data_id} -> {resp.status} {body}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
