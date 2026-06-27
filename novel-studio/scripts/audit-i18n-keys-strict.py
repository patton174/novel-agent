#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / "studio-platform/studio-platform-i18n/src/main/resources/i18n"

def parse(p):
    d = {}
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            d[k.strip()] = v
    return d

en = parse(I18N / "messages_en.properties")
zh = parse(I18N / "messages_zh_CN.properties")
props = set(en) | set(zh)

pats = [
    re.compile(r'\.keyed\([^"]*"([a-z][a-z0-9_.]+)"'),
    re.compile(r'messages\.get(?:OrDefault)?\(\s*"([a-z][a-z0-9_.]+)"'),
    re.compile(r'msg\(\s*"([a-z][a-z0-9_.]+)"'),
    re.compile(r'resolveMessage\(\s*"([a-z][a-z0-9_.]+)"'),
    re.compile(r'resolveLiteral\(\s*"([a-z][a-z0-9_.]+)"'),
    re.compile(r'internalError\(\s*"([a-z][a-z0-9_.]+)"'),
    re.compile(r'buildRunFailed\(\s*"([a-z][a-z0-9_.]+)"'),
    re.compile(r'new IllegalStateException\(\s*"([a-z][a-z0-9_.]+)"'),
    re.compile(r'message\s*=\s*"\{([a-z][a-z0-9_.]+)\}"'),
    re.compile(r'setParseError\("([a-z][a-z0-9_.]+)'),
]
keys = set()
for path in ROOT.rglob("*.java"):
    if "target" in path.parts:
        continue
    t = path.read_text(encoding="utf-8", errors="replace")
    for p in pats:
        keys |= set(p.findall(t))

rc = ROOT / "studio-kernel/src/main/java/cn/novelstudio/kernel/enums/ResultCode.java"
keys |= set(re.findall(r'"([a-z][a-z0-9_.]+)"\s*,\s*"[^"]*"\s*\)', rc.read_text(encoding="utf-8")))

# Agent ternary message keys
for path in ROOT.rglob("*.java"):
    if "target" in path.parts:
        continue
    t = path.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(r'\?\s*"([a-z][a-z0-9_.]+)"\s*:', t):
        keys.add(m.group(1))
    for m in re.finditer(r'errorMessage == null[^"]*"([a-z][a-z0-9_.]+)"', t):
        keys.add(m.group(1))

missing = sorted(k for k in keys if k not in props)
print("Missing from properties:", len(missing))
for k in missing:
    print(" ", k)
print("EN-only:", sorted(set(en) - set(zh)))
print("ZH-only:", sorted(set(zh) - set(en)))

code_text = ""
for path in ROOT.rglob("*.java"):
    if "target" not in path.parts:
        code_text += path.read_text(encoding="utf-8", errors="replace")

def referenced(key, text):
    if f'"{key}"' in text or f"{{{key}}}" in text:
        return True
    if key == "upload.parse_timeout" and "upload.parse_timeout|" in text:
        return True
    if key.startswith("plan.") and key.count(".") == 2 and not key.startswith("plan.feature.") and not key.startswith("plan.price.") and not key.startswith("plan.cta."):
        return '"plan." + code + "." + field' in text
    if key.startswith("plan.feature."):
        return '"plan.feature." + key' in text
    return False

orphaned = sorted(k for k in props if not referenced(k, code_text))
print("Orphaned:", len(orphaned))
for k in orphaned:
    print(" ", k)
