"""Memory mutation context — ops log + model-facing summaries."""

from app.agent.context.memory_log import memory_ops_for_plan_json
from app.agent.context.prompting.run_context import assemble_run_context
from app.agent.schemas import AgentRunContext
from app.agent.tools.memory import _memory_mutation_patch


def test_memory_mutation_patch_appends_ops_log():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        user_message="hi",
        novel_id="novel-1",
    )
    patch1 = _memory_mutation_patch(
        ctx,
        tool="CreateMemory",
        ok=True,
        summary="CreateMemory OK · title='世界观'",
        memory_id="mem-1",
        scope="世界观",
        title="世界观",
    )
    ctx = ctx.model_copy(
        update={"context_patch": {**dict(ctx.context_patch or {}), **patch1}}
    )
    patch2 = _memory_mutation_patch(
        ctx,
        tool="CreateMemory",
        ok=True,
        summary="CreateMemory OK · title='角色设定'",
        memory_id="mem-2",
        scope="角色设定",
        title="角色设定",
    )
    merged = dict(ctx.context_patch or {})
    merged.update(patch2)
    ops = memory_ops_for_plan_json(merged.get("memory_ops_log"))
    assert len(ops) == 2
    assert all(row.get("ok") for row in ops)
    assert ops[0].get("title") == "世界观"
    assert ops[1].get("title") == "角色设定"


def test_assemble_run_context_exposes_memory_ops_log():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        user_message="hi",
        novel_id="novel-1",
        context_patch={
            "memory_ops_log": [
                {
                    "tool": "CreateMemory",
                    "ok": True,
                    "summary": "CreateMemory OK · title='世界观'",
                    "scope": "世界观",
                    "item_id": "mem-1",
                    "title": "世界观",
                },
                {
                    "tool": "CreateMemory",
                    "ok": True,
                    "summary": "CreateMemory OK · title='角色设定'",
                    "scope": "角色设定",
                    "item_id": "mem-2",
                    "title": "角色设定",
                },
            ]
        },
    )
    bundle = assemble_run_context(ctx)
    memory = bundle.get("memory") or {}
    assert memory.get("create_memory_ok_count") == 2
    assert len(memory.get("ops_log") or []) == 2


def test_build_memory_write_batch_ack_lists_multiple_creates():
    from app.agent.context.memory_log import build_memory_write_batch_ack

    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        user_message="hi",
        context_patch={
            "memory_ops_log": [
                {
                    "tool": "CreateMemory",
                    "ok": True,
                    "title": "世界观",
                    "scope": "世界观",
                    "item_id": "m1",
                },
                {
                    "tool": "CreateMemory",
                    "ok": True,
                    "title": "角色设定",
                    "scope": "角色设定",
                    "item_id": "m2",
                },
            ],
            "memory_tree_index": {"世界观": {}, "角色设定": {}},
        },
    )
    text = build_memory_write_batch_ack(ctx)
    assert text is not None
    assert "CreateMemory 成功 2 个根分类" in text
    assert "世界观" in text
    assert "角色设定" in text
