#!/usr/bin/env python3
"""将 Nacos YAML 发布到指定命名空间（NACOS_NAMESPACE + SPRING_PROFILES_ACTIVE）。

每个服务发布两份 dataId：agent-*.yaml 与 agent-*-{profile}.yaml（如 agent-gateway-prod.yaml）。
生产：DEPLOY_ENV=prod NACOS_NAMESPACE=<prod-uuid> SPRING_PROFILES_ACTIVE=prod
开发：DEPLOY_ENV=dev  NACOS_NAMESPACE=<dev-uuid>  SPRING_PROFILES_ACTIVE=dev
"""
from __future__ import annotations

import os
from pathlib import Path

import httpx

NACOS = os.environ.get("NACOS_SERVER_ADDR", "127.0.0.1:8848")
if not NACOS.startswith("http"):
    NACOS = f"http://{NACOS}"
USER = os.environ.get("NACOS_USERNAME", "nacos")
PASSWORD = os.environ["NACOS_PASSWORD"]
GROUP = os.environ.get("NACOS_GROUP", "NOVEL_AGENT_GROUP")
NAMESPACE = os.environ["NACOS_NAMESPACE"]
IDENTITY_KEY = os.environ.get("NACOS_AUTH_IDENTITY_KEY", "root")
IDENTITY_VALUE = os.environ.get("NACOS_AUTH_IDENTITY_VALUE", "")

ROOT = Path(
    os.environ.get(
        "NACOS_CONFIG_DIR",
        str(Path(__file__).resolve().parents[1] / "docs" / "deploy" / "nacos"),
    )
)


def _identity_headers() -> dict[str, str]:
    return {
        "identityKey": IDENTITY_KEY,
        "identityValue": IDENTITY_VALUE,
    }


def _login(client: httpx.Client) -> str:
    resp = client.post(
        f"{NACOS}/nacos/v1/auth/login",
        data={"username": USER, "password": PASSWORD},
        headers=_identity_headers(),
    )
    resp.raise_for_status()
    token = resp.json().get("accessToken")
    if not token:
        raise RuntimeError(f"Nacos login failed: {resp.text}")
    return token


PROFILE = os.environ.get("SPRING_PROFILES_ACTIVE", "dev").strip()


def publish(data_id: str, client: httpx.Client, token: str, content: str | None = None) -> None:
    path = ROOT / data_id
    if content is None:
        if not path.is_file():
            raise FileNotFoundError(path)
        content = path.read_text(encoding="utf-8")
    # Nacos 3.x 配置 API（8848）；v1/cs/configs 已不可用
    url = f"{NACOS}/nacos/v3/admin/cs/config"
    payload = {
        "dataId": data_id,
        "groupName": GROUP,
        "namespaceId": NAMESPACE,
        "type": "yaml",
        "content": content,
        "accessToken": token,
    }
    print(f"[REQ] POST {url}")
    print(
        f"[REQ] dataId={data_id} groupName={GROUP} namespaceId={NAMESPACE} type=yaml "
        f"content_len={len(content)}"
    )
    resp = client.post(url, data=payload, headers=_identity_headers())
    print(f"[RESP] {data_id} -> {resp.status_code}")
    body = (resp.text or "").strip()
    print(f"[RESP] body: {body if body else '<empty>'}")
    resp.raise_for_status()


if __name__ == "__main__":
    with httpx.Client(trust_env=False, timeout=15.0) as client:
        token = _login(client)
        print(f"[OK] Nacos login, token_len={len(token)}")
        for name in (
            "agent-auth.yaml",
            "agent-gateway.yaml",
            "agent-pyai.yaml",
            "agent-content.yaml",
            "agent-consumer.yaml",
            "agent-billing.yaml",
        ):
            content = (ROOT / name).read_text(encoding="utf-8")
            publish(name, client, token, content)
            if PROFILE:
                profile_id = name.replace(".yaml", f"-{PROFILE}.yaml")
                publish(profile_id, client, token, content)
                print(f"[OK] mirrored {name} -> {profile_id}")
