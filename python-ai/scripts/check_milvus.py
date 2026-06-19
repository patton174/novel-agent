#!/usr/bin/env python3
"""Probe Milvus connectivity using python-ai settings."""

from __future__ import annotations

import sys


def main() -> int:
    from app.config import settings

    host = settings.milvus_host
    port = settings.milvus_port
    print(f"Milvus target: {host}:{port}")

    try:
        from pymilvus import connections, utility

        connections.connect(
            alias="default",
            host=host,
            port=str(port),
            user=settings.milvus_user or "",
            password=settings.milvus_password or "",
        )
        version = utility.get_server_version()
        print(f"OK server_version={version}")
        return 0
    except Exception as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
