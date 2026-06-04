"""Virtual path helpers for novel agent VFS."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal
from urllib.parse import unquote

CHAPTER_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

VfsKind = Literal[
    "meta",
    "chapter",
    "chapter_index",
    "memory",
    "outline",
    "notebook",
    "unknown",
]


@dataclass(frozen=True)
class VfsPath:
    kind: VfsKind
    novel_id: str
    chapter_id: str = ""
    memory_scope: str = ""
    memory_key: str = ""
    notebook_name: str = ""
    raw: str = ""


def novel_root(novel_id: str) -> str:
    return f"/novel/{novel_id}"


def normalize_path(path: str) -> str:
    p = (path or "").strip().replace("\\", "/")
    if not p.startswith("/"):
        p = "/" + p
    while "//" in p:
        p = p.replace("//", "/")
    return p.rstrip("/") or "/"


def parse_vfs_path(path: str, *, expected_novel_id: str) -> tuple[VfsPath | None, str | None]:
    p = normalize_path(path)
    m = re.match(
        r"^/novel/([^/]+)(?:/(.*))?$",
        p,
        re.IGNORECASE,
    )
    if not m:
        return None, f"path must be under /novel/{{novelId}}/..., got {path!r}"
    novel_id = m.group(1)
    if expected_novel_id and novel_id != expected_novel_id:
        return None, (
            f"path novel id {novel_id!r} does not match run novel {expected_novel_id!r}. "
            f"Use RUN_CONTEXT_JSON novel.vfs_root "
            f"(e.g. /novel/{expected_novel_id}/chapters/...), not a {{novelId}} placeholder."
        )
    rest = (m.group(2) or "").strip("/")
    if not rest:
        return VfsPath(kind="unknown", novel_id=novel_id, raw=p), None
    if rest == "meta.json":
        return VfsPath(kind="meta", novel_id=novel_id, raw=p), None
    if rest in ("chapters", "chapters/index.json"):
        return VfsPath(kind="chapter_index", novel_id=novel_id, raw=p), None
    if rest.startswith("chapters/") and rest.endswith(".md"):
        cid = rest[len("chapters/") : -len(".md")]
        return VfsPath(kind="chapter", novel_id=novel_id, chapter_id=cid, raw=p), None
    if rest == "outline/plan.md":
        return VfsPath(kind="outline", novel_id=novel_id, raw=p), None
    mm = re.match(r"^memory/([^/]+)/([^/]+)\.json$", rest)
    if mm:
        scope = mm.group(1)
        key_raw = unquote(mm.group(2))
        return VfsPath(
            kind="memory",
            novel_id=novel_id,
            memory_scope=scope,
            memory_key=key_raw,
            raw=p,
        ), None
    nb = re.match(r"^uploads/(.+\.ipynb)$", rest, re.IGNORECASE)
    if nb:
        return VfsPath(
            kind="notebook",
            novel_id=novel_id,
            notebook_name=nb.group(1),
            raw=p,
        ), None
    return VfsPath(kind="unknown", novel_id=novel_id, raw=p), None
