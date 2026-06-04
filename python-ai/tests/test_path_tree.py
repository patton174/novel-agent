from app.agent_step.vfs.path_tree import format_paths_as_tree


def test_format_paths_as_tree_groups_by_directory():
    lines = format_paths_as_tree(
        [
            "/novel/n1/chapters/a.md",
            "/novel/n1/chapters/b.md",
            "/novel/n1/memory/world/x.json",
        ]
    )
    text = "\n".join(lines)
    assert "novel/" in text
    assert "chapters/" in text
    assert "a.md" in text
    assert "memory/" in text
