from app.agent.harness.events import (
    build_tool_completed_sse_payload,
    extract_chapter_memory_read_labels,
)


def test_extract_chapter_memory_read_labels_from_summary():
    content = """# 记忆文档 v1
- scope: 章节记忆
- id: 11639021-d1c3-43e0-8581-08755eeb74dd
- title: 11639021-d1c3-43e0-8581-08755eeb74dd

---

# 第10章《新的开始》摘要

## 天梯震动
- 升级
"""
    path = "/novel/n1/memory/chapter/11639021-d1c3-43e0-8581-08755eeb74dd.json"
    labels = extract_chapter_memory_read_labels(content, path)
    assert labels == ["第10章《新的开始》"]


def test_read_chapter_memory_emits_human_label():
    content = """# 记忆文档 v1
- title: 11639021-d1c3-43e0-8581-08755eeb74dd

---

# 第5章《风蚀洞穴》摘要
"""
    path = "/novel/n1/memory/chapter/99e12c36-c825-4f94-9557-467465ebdeac.json"
    payload = build_tool_completed_sse_payload(
        "ReadMemory",
        content=content,
        tool_input={"scope": "chapter", "key": "99e12c36-c825-4f94-9557-467465ebdeac", "file_path": path},
    )
    assert payload["result_labels"] == ["第5章《风蚀洞穴》"]
