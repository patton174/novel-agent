"""实体名规范化 + 跨块合并。"""

from __future__ import annotations

import re

_PAREN_RE = re.compile(r"[（(].*?[)）]")
_WS_RE = re.compile(r"\s+")


def normalize_name(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        return ""
    s = _PAREN_RE.sub("", s)
    s = s.strip("“”‘’\"'`·")
    s = _WS_RE.sub("", s)
    return s


def merge_extraction(block_results: list[dict]) -> dict:
    """合并多块抽取结果：实体按规范化名去重(累积 aliases)，关系按(src,rel,dst)去重。"""
    entities: dict[str, dict] = {}
    relations: list[dict] = []
    seen_rel: set[tuple[str, str, str]] = set()

    for blk in block_results:
        for e in blk.get("entities", []):
            orig = (e.get("name") or "").strip()
            name = normalize_name(orig)
            if not name:
                continue
            if name not in entities:
                entities[name] = {
                    "name": name,
                    "type": (e.get("type") or "unknown").strip() or "unknown",
                    "aliases": set(),
                }
            if orig and orig != name:
                entities[name]["aliases"].add(orig)
        for r in blk.get("relations", []):
            src = normalize_name(r.get("src", ""))
            rel = (r.get("rel") or "").strip()
            dst = normalize_name(r.get("dst", ""))
            if not (src and rel and dst):
                continue
            key = (src, rel, dst)
            if key in seen_rel:
                continue
            seen_rel.add(key)
            relations.append({"src": src, "rel": rel, "dst": dst})

    out_entities = []
    for e in entities.values():
        aliases = ",".join(sorted(e["aliases"])) if e["aliases"] else None
        out_entities.append({"name": e["name"], "type": e["type"], "aliases": aliases})
    return {"entities": out_entities, "relations": relations}
