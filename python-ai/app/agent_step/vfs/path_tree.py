"""Format VFS API paths as an indented tree for Glob/Grep output."""

from __future__ import annotations


def format_paths_as_tree(paths: list[str]) -> list[str]:
    """Turn flat API paths into indented tree lines (directories end with /)."""
    if not paths:
        return []

    class _Node:
        __slots__ = ("children",)

        def __init__(self) -> None:
            self.children: dict[str, _Node] = {}

    root = _Node()

    for raw in paths:
        path = (raw or "").replace("\\", "/").strip()
        if not path:
            continue
        parts = [p for p in path.split("/") if p]
        if not parts:
            continue
        node = root
        for i, part in enumerate(parts):
            is_last = i == len(parts) - 1
            key = part if is_last else f"{part}/"
            node = node.children.setdefault(key, _Node())

    lines: list[str] = []

    def walk(node: _Node, prefix: str) -> None:
        items = sorted(node.children.items(), key=lambda item: (item[0].endswith("/"), item[0]))
        for idx, (name, child) in enumerate(items):
            last = idx == len(items) - 1
            branch = "└── " if last else "├── "
            cont = "    " if last else "│   "
            lines.append(f"{prefix}{branch}{name}")
            if child.children:
                walk(child, prefix + cont)

    walk(root, "")
    return lines
