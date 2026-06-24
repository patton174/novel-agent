"""Normalize cc-switch icon index for frontend use."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "frontend" / "src" / "icons" / "cc-switch"
SRC = ROOT / "index.ts"
OUT = ROOT / "icons.ts"

URL_ICONS = {
    "apikeyfun": "apikeyfun.png",
    "apinebula": "apinebula_icon.png",
    "atlascloud": "atlascloud_icon.png",
    "byteplus": "byteplus.png",
    "ccsub": "ccsub.svg",
    "claudeapi": "ClaudeApi.png",
    "claudecn": "claudecn.png",
    "cherryin": "cherryin.png",
    "eflowcode": "eflowcode.png",
    "etok": "etok.png",
    "hermes": "hermes.png",
    "huoshan": "huoshan.png",
    "pateway": "pateway.jpg",
    "pipellm": "pipellm.png",
    "relaxcode": "relaxcode.png",
    "runapi": "runapi.jpg",
    "shengsuanyun": "shengsuanyun.svg",
    "sudocode": "sudocode.png",
    "unity2": "unity2.png",
}
BASE = "https://raw.githubusercontent.com/farion1231/cc-switch/main/src/icons/extracted/"


def main() -> None:
    text = SRC.read_text(encoding="utf-8")
    text = re.sub(r"^import .*?\n", "", text, flags=re.M)
    lines = ["export const iconUrls: Record<string, string> = {"]
    for key, fname in sorted(URL_ICONS.items()):
        lines.append(f"  {key}: '{BASE}{fname}',")
    lines.append("}")
    new_urls = "\n".join(lines)
    text = re.sub(
        r"export const iconUrls: Record<string, string> = \{[\s\S]*?\n\};",
        new_urls,
        text,
    )
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT} ({len(text)} bytes)")


if __name__ == "__main__":
    main()
