"""Generate frontend model presets from cc-switch claudeProviderPresets.ts snapshot."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "scripts" / "cc-switch-claudeProviderPresets.snapshot.ts"
OUT = ROOT / "frontend" / "src" / "config" / "modelProviderPresets.data.json"


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def parse_presets(text: str) -> list[dict]:
    chunks = re.split(r"\n \{", text)
    out: list[dict] = []
    seen_ids: set[str] = set()

    for chunk in chunks[1:]:
        if re.search(r"requiresOAuth:\s*true", chunk):
            continue
        if re.search(r'providerType:\s*"(?:github_copilot|codex_oauth)"', chunk):
            continue
        if re.search(r'apiFormat:\s*"(?!anthropic\b)', chunk):
            continue
        if re.search(r"hidden:\s*true", chunk):
            continue

        m_name = re.search(r'name:\s*"([^"]+)"', chunk)
        if not m_name:
            continue
        name = m_name.group(1)

        m_base = re.search(r'ANTHROPIC_BASE_URL:\s*"([^"]+)"', chunk)
        if not m_base:
            m_base = re.search(r'ANTHROPIC_BASE_URL:\s*\n\s*"([^"]+)"', chunk)
        if m_base:
            base_url = m_base.group(1)
        elif name == "Claude Official":
            base_url = "https://api.anthropic.com"
        else:
            continue

        if "${" in base_url:
            continue

        m_model = re.search(r'ANTHROPIC_MODEL:\s*"([^"]+)"', chunk)
        model = m_model.group(1) if m_model else "claude-sonnet-4-20250514"

        m_icon = re.search(r'icon:\s*"([^"]+)"', chunk)
        provider = m_icon.group(1) if m_icon else slugify(name)[:24] or "custom"

        m_cat = re.search(r'category:\s*"([^"]+)"', chunk)
        category = m_cat.group(1) if m_cat else "third_party"

        pid = slugify(name)
        if pid in seen_ids:
            n = 2
            while f"{pid}-{n}" in seen_ids:
                n += 1
            pid = f"{pid}-{n}"
        seen_ids.add(pid)

        out.append(
            {
                "id": pid,
                "label": name,
                "provider": provider,
                "protocol": "anthropic",
                "modelName": model,
                "baseUrl": base_url,
                "suggestedLabel": name,
                "suggestedCode": slugify(name)[:48],
                "category": category,
            }
        )

    out.append(
        {
            "id": "custom",
            "label": "Custom",
            "provider": "custom",
            "protocol": "anthropic",
            "modelName": "",
            "baseUrl": "",
            "suggestedLabel": "",
            "suggestedCode": "",
            "category": "custom",
        }
    )
    return out


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"missing snapshot: {SRC}")
    presets = parse_presets(SRC.read_text(encoding="utf-8"))
    OUT.write_text(json.dumps(presets, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {len(presets)} presets -> {OUT}")


if __name__ == "__main__":
    main()
