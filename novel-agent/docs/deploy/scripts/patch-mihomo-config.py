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
path.write_text(text, encoding="utf-8")
print("patched")
for line in text.splitlines():
    if line.startswith(("allow-lan", "bind-address", "port:", "socks-port:")):
        print(line)
