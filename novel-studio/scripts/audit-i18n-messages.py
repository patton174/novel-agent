#!/usr/bin/env python3
"""Exhaustive audit of messages_en.properties vs messages_zh_CN.properties."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
I18N_DIR = ROOT / "studio-platform" / "studio-platform-i18n" / "src" / "main" / "resources" / "i18n"
EN_FILE = I18N_DIR / "messages_en.properties"
ZH_FILE = I18N_DIR / "messages_zh_CN.properties"
FRONTEND = ROOT.parent / "frontend"

KEY_RE = re.compile(r"^[a-z][a-z0-9_.]*$")

# Java: explicit string literals used as i18n keys
JAVA_PATTERNS = [
    re.compile(r'(?:messages|studioMessages)\.get(?:OrDefault)?\(\s*"([a-z][a-z0-9_.]+)"'),
    re.compile(r'messageSource\.getMessage\(\s*"([a-z][a-z0-9_.]+)"'),
    re.compile(r'(?:Validation|NotFound|Forbidden|Unauthorized|Biz)Exception\.keyed\([^"]*"([a-z][a-z0-9_.]+)"'),
    re.compile(r'(?:Validation|NotFound|Forbidden|Unauthorized|Biz)Exception\.keyed\(\s*ResultCode\.[A-Z_]+,\s*"([a-z][a-z0-9_.]+)"'),
    re.compile(r'PyaiExceptions\.internalError\("([a-z][a-z0-9_.]+)"'),
    re.compile(r'AuthExceptions\.internalError\("([a-z][a-z0-9_.]+)"'),
    re.compile(r'resolveMessage\("([a-z][a-z0-9_.]+)"'),
    re.compile(r'localizer\.resolveLiteral\("([a-z][a-z0-9_.]+)"'),
    re.compile(r'buildRunFailed\("([a-z][a-z0-9_.]+)"'),
    re.compile(r'msg\("([a-z][a-z0-9_.]+)"'),
    re.compile(r'new IllegalStateException\("([a-z][a-z0-9_.]+)"'),
    re.compile(r'setParseError\("([a-z][a-z0-9_.]+)'),
    re.compile(r'message\s*=\s*"\{([a-z][a-z0-9_.]+)\}"'),
    re.compile(r'"([a-z][a-z0-9_.]+)"\s*,\s*(?:code|args|detail|jobType|ext|timeoutSeconds)'),
    re.compile(r'return\s+"([a-z][a-z0-9_.]+)"\s*;'),
    re.compile(r'\?\s*"([a-z][a-z0-9_.]+)"\s*:'),
    re.compile(r':\s*"([a-z][a-z0-9_.]+)"\s*;'),
    re.compile(r'emit\.accept\(buildRunFailed\("([a-z][a-z0-9_.]+)"\)'),
]

RESULT_CODE_RE = re.compile(r'"([a-z][a-z0-9_.]+)"\s*,\s*"[^"]*"\s*\)')

DYNAMIC_PREFIXES = [
    ("plan.", ("free", "hobby", "lite", "pro", "enterprise"), ("name", "desc")),
    ("plan.feature.", ("basic_editor", "txt_export", "pdf_export", "custom_model", "priority_support", "team_collaboration", "custom_integrations"), ()),
]

SKIP_LITERALS = {
    "plan.result", "run.failed", "think.delta", "step.started", "step.llm.delta",
    "step.completed", "tool.completed", "run.started", "run.completed", "run.paused",
    "run.resumed", "chapter.persist.failed", "site.content.update", "payment.idatariver.enabled",
    "payment.idatariver.base_url", "payment.idatariver.merchant_secret", "payment.idatariver.project_id",
    "payment.idatariver.public_base_url", "payment.idatariver.default_pay_method", "payment.idatariver.locale",
    "studio.batch.queue", "application.epub", "notes.markdown", "a.zip", "a.epub", "user",
    "app.i18n", "payment.not_configured",
}


def parse_properties(path: Path) -> dict[str, str]:
    keys: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        keys[k.strip()] = v
    return keys


def collect_result_code_keys() -> set[str]:
    path = ROOT / "studio-kernel" / "src" / "main" / "java" / "cn" / "novelstudio" / "kernel" / "enums" / "ResultCode.java"
    if not path.exists():
        return set()
    text = path.read_text(encoding="utf-8")
    return set(re.findall(r'"([a-z][a-z0-9_.]+)"\s*,\s*"[^"]*"\s*\)', text))


def collect_java_keys() -> set[str]:
    found: set[str] = set()
    found |= collect_result_code_keys()
    for path in ROOT.rglob("*.java"):
        if "target" in path.parts:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for pat in JAVA_PATTERNS:
            found |= set(pat.findall(text))
        # AgentRunCoordinator style: ternary with key strings
        for m in re.finditer(r'\?\s*resolveMessage\("([a-z][a-z0-9_.]+)"\)', text):
            found.add(m.group(1))
        for m in re.finditer(r'\?\s*"([a-z][a-z0-9_.]+)"\s*:', text):
            k = m.group(1)
            if KEY_RE.match(k) and k not in SKIP_LITERALS:
                found.add(k)
    return {k for k in found if KEY_RE.match(k) and k not in SKIP_LITERALS}


def expand_dynamic_keys(code_keys: set[str]) -> set[str]:
    expanded = set(code_keys)
    for prefix, codes, fields in DYNAMIC_PREFIXES:
        if any(k.startswith(prefix) for k in code_keys) or prefix.startswith("plan."):
            for code in codes:
                for field in fields or ("name", "desc"):
                    expanded.add(f"{prefix}{code}.{field}" if fields else f"{prefix}{code}")
    return expanded


def key_referenced_in_code(key: str, code_text: str) -> bool:
    if f'"{key}"' in code_text:
        return True
    if f"'{key}'" in code_text:
        return True
    if f"{{{key}}}" in code_text:
        return True
    # Dynamic: plan.{code}.name
    if key.startswith("plan.") and key.count(".") >= 2:
        parts = key.split(".")
        if len(parts) == 3 and parts[0] == "plan" and parts[1] != "feature" and parts[1] != "price" and parts[1] != "cta":
            return '"plan." + code + "." + field' in code_text or "plan." in code_text
    if key.startswith("plan.feature."):
        return '"plan.feature." + key' in code_text
    if key == "upload.parse_timeout":
        return "upload.parse_timeout|" in code_text
    if key.startswith("plan.") and (key.endswith(".name") or key.endswith(".desc")):
        return '"plan." + code + "." + field' in code_text
    return False


def main() -> int:
    en = parse_properties(EN_FILE)
    zh = parse_properties(ZH_FILE)
    en_keys, zh_keys = set(en), set(zh)

    missing_in_zh = sorted(en_keys - zh_keys)
    missing_in_en = sorted(zh_keys - en_keys)

    code_keys = expand_dynamic_keys(collect_java_keys())
    all_prop = en_keys | zh_keys
    missing_in_props = sorted(k for k in code_keys if k not in all_prop)

    code_text = ""
    for path in ROOT.rglob("*.java"):
        if "target" not in path.parts:
            code_text += path.read_text(encoding="utf-8", errors="replace") + "\n"

    orphaned = sorted(k for k in all_prop if not key_referenced_in_code(k, code_text))

    print("=== SUMMARY ===")
    print(f"EN keys: {len(en_keys)}")
    print(f"ZH keys: {len(zh_keys)}")
    print(f"Missing in ZH: {len(missing_in_zh)}")
    print(f"Missing in EN: {len(missing_in_en)}")
    print(f"Code keys missing in properties: {len(missing_in_props)}")
    print(f"Orphaned property keys: {len(orphaned)}")
    print()

    if missing_in_zh:
        print("=== MISSING IN ZH ===")
        for k in missing_in_zh:
            print(f"  {k}={en[k]}")
    if missing_in_en:
        print("=== MISSING IN EN ===")
        for k in missing_in_en:
            print(f"  {k}={zh[k]}")
    if missing_in_props:
        print("=== CODE KEYS MISSING IN PROPERTIES ===")
        for k in missing_in_props:
            print(f"  {k}")
    if orphaned:
        print("=== ORPHANED (report only) ===")
        for k in orphaned:
            print(f"  {k}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
