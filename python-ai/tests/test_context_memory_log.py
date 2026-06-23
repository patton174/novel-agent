"""Tests for memory operation log in planner context."""

from app.agent.context.memory_log import (
    append_memory_op_log,
    append_memory_read_record,
    format_character_roster_for_plan,
    format_memory_ops_for_plan,
    update_character_roster,
)


def test_memory_ops_log_appends_without_dropping_failures():
    patch = append_memory_op_log(
        {},
        tool="memory_delete",
        ok=False,
        summary="删除失败：需要 scope 与 key",
        reason="缺少 scope 与 key",
    )
    patch = append_memory_op_log(
        patch,
        tool="memory_delete",
        ok=True,
        summary="已删除角色 · 苏晚（整卡）",
        scope="character",
        item_id="苏晚",
        key="*",
    )
    text = format_memory_ops_for_plan(patch["memory_ops_log"])
    assert "FAIL" in text
    assert "苏晚" in text
    assert text.count("memory_delete") == 2


def test_character_roster_survives_world_read():
    patch = update_character_roster({}, item_ids=["唐云", "苏夜", "女主"])
    patch = update_character_roster(patch, removed="女主")
    line = format_character_roster_for_plan(patch["character_roster"], {"ok": True, "scope": "world"})
    assert line.startswith("character_roster：")
    assert "唐云" in line
    assert "苏夜" in line
    assert "女主" not in line


def test_memory_reads_session_keeps_parallel_read_ids():
    patch = append_memory_read_record(
        {},
        memory_id="mem-a",
        scope="world",
        title="力量体系",
    )
    patch = append_memory_read_record(
        patch,
        memory_id="mem-b",
        scope="character",
        title="主角",
    )
    reads = patch.get("memory_reads_session")
    assert isinstance(reads, list)
    assert len(reads) == 2
    assert reads[0]["memory_id"] == "mem-a"
    assert reads[1]["memory_id"] == "mem-b"
    assert patch["last_memory_read"]["memory_id"] == "mem-b"
    ops = patch.get("memory_ops_log")
    assert isinstance(ops, list)
    assert len(ops) == 2
