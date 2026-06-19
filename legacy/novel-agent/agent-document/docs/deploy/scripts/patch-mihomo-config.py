#!/usr/bin/env python3
"""Patch mihomo config for Docker LAN access."""
import re
from pathlib import Path

path = Path("/etc/mihomo/config.yaml")
text = path.read_text(encoding="utf-8")
text = re.sub(r"^bind-address:.*\n", "", text, flags=re.M)
text = text.replace("allow-lan: false", "allow-lan: true")
if "bind-address:" not in text:
    text = text.replace("allow-lan: true", 'allow-lan: true\nbind-address: "*"', 1)

# Docker 内 python-ai 需调用外部控制器换节点
text = re.sub(
    r"^external-controller:.*$",
    "external-controller: '0.0.0.0:9090'",
    text,
    flags=re.M,
)
if "external-controller:" not in text:
    text = text.replace(
        "allow-lan: true",
        "allow-lan: true\nexternal-controller: '0.0.0.0:9090'",
        1,
    )

path.write_text(text, encoding="utf-8")
print("patched")
for line in text.splitlines():
    if line.startswith(("allow-lan", "bind-address", "port:", "socks-port:", "external-controller")):
        print(line)
