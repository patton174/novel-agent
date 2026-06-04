"""Shared headers for VFS tools — all inventory comes from HTTP APIs."""

from __future__ import annotations

from app.agent_step.vfs.path_tree import format_paths_as_tree

VFS_API_SOURCE_HEADER = (
    "# 数据来源：作品库 HTTP API（PostgreSQL / story-memory），非本机磁盘文件扫描。"
)


def format_glob_inventory(
    *,
    chapter_count: int,
    memory_count: int,
    paths: list[str],
) -> str:
    lines = [
        VFS_API_SOURCE_HEADER,
        f"# 章节（Content API）: {chapter_count} 条可访问路径",
        f"# 记忆（story-memory API）: {memory_count} 条",
        "# 禁止用本列表行数推断「磁盘上有几个文件」；章数/记忆数以 RUN_CONTEXT catalog 为准。",
    ]
    if not paths:
        lines.append("(no matches)")
    else:
        tree_lines = format_paths_as_tree(sorted(paths))
        if tree_lines:
            lines.extend(tree_lines)
        else:
            lines.extend(sorted(paths))
    return "\n".join(lines)
