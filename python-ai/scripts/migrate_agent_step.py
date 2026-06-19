#!/usr/bin/env python3
"""One-shot migration: app/agent_step -> app/agent/{loop,harness,context,streaming,backend,tools}."""

from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
STEP = APP / "agent_step"
AGENT = APP / "agent"

# (source relative to agent_step, dest relative to agent)
MOVES: list[tuple[str, str]] = [
    ("query_loop.py", "loop.py"),
    ("router.py", "router.py"),
    ("schemas.py", "schemas.py"),
    ("query_loop_support.py", "harness/loop_support.py"),
    ("run_session.py", "harness/run_session.py"),
    ("message_history.py", "harness/message_history.py"),
    ("transcript.py", "harness/transcript.py"),
    ("main_loop_llm.py", "harness/main_loop_llm.py"),
    ("subagent.py", "harness/subagent.py"),
    ("subagent_sse.py", "harness/subagent_sse.py"),
    ("subagent_policy.py", "harness/subagent_policy.py"),
    ("structured_llm.py", "harness/structured_llm.py"),
    ("structured_submit.py", "harness/structured_submit.py"),
    ("llm_parse.py", "harness/llm_parse.py"),
    ("llm_trace.py", "harness/llm_trace.py"),
    ("session_title.py", "harness/session_title.py"),
    ("choose_defaults.py", "harness/choose_defaults.py"),
    ("errors.py", "harness/errors.py"),
    ("tool_execution.py", "harness/tool_execution.py"),
    ("tool_prepare.py", "harness/tool_prepare.py"),
    ("tool_batch_errors.py", "harness/tool_batch_errors.py"),
    ("tool_orchestration.py", "harness/tool_orchestration.py"),
    ("tool_call_mapping.py", "harness/tool_call_mapping.py"),
    ("tool_result_routing.py", "harness/tool_result_routing.py"),
    ("tool_errors.py", "harness/tool_errors.py"),
    ("orchestration_contract.py", "harness/orchestration_contract.py"),
    ("plan_context.py", "harness/plan_context.py"),
    ("routing.py", "harness/routing.py"),
    ("routing_protocol.py", "harness/routing_protocol.py"),
    ("visible_text_channel.py", "harness/visible_text_channel.py"),
    ("intent_message.py", "harness/intent_message.py"),
    ("chapter_body.py", "harness/chapter_body.py"),
    ("chapter_body_format.py", "harness/chapter_body_format.py"),
    ("events.py", "harness/events.py"),
    ("cc_visibility.py", "harness/cc_visibility.py"),
    ("tool_display.py", "harness/tool_display.py"),
    ("tool_ui.py", "harness/tool_ui.py"),
    ("memory_fields.py", "harness/memory_fields.py"),
    ("context_compact.py", "context/compact.py"),
    ("context_compact_autocompact.py", "context/compact_autocompact.py"),
    ("context_compact_micro.py", "context/compact_micro.py"),
    ("context_enrich.py", "context/enrich.py"),
    ("context_policy.py", "context/policy.py"),
    ("context_meter.py", "context/meter.py"),
    ("context_usage.py", "context/usage.py"),
    ("context_memory_log.py", "context/memory_log.py"),
    ("stream_channels.py", "streaming/stream_channels.py"),
    ("stream_items.py", "streaming/stream_items.py"),
    ("json_stream.py", "streaming/json_stream.py"),
    ("tools/sse_bridge.py", "streaming/sse_bridge.py"),
    ("tools/tool.py", "tools/tool.py"),
    ("tools/run_tool_use.py", "tools/run_tool_use.py"),
    ("tools/langchain_bind.py", "tools/langchain_bind.py"),
    ("tools/run_tools.py", "tools/run_tools.py"),
    ("tools/hooks.py", "tools/hooks.py"),
    ("tools/streaming_executor.py", "tools/streaming_executor.py"),
    ("tools/result_storage.py", "tools/result_storage.py"),
    ("vfs/chapter_store.py", "backend/chapter_store.py"),
    ("vfs/chapter_meta.py", "backend/chapter_meta_impl.py"),
    ("vfs/memory_store.py", "backend/memory_store.py"),
    ("vfs/memory_catalog.py", "backend/memory_catalog.py"),
    ("vfs/memory_document.py", "backend/memory_document.py"),
    ("vfs/memory_schema.py", "backend/memory_schema.py"),
    ("vfs/memory_write_guard.py", "backend/memory_write_guard.py"),
    ("vfs/format.py", "backend/format.py"),
]

# Longest-prefix-first import rewrites
IMPORT_REWRITES: list[tuple[str, str]] = [
    ("app.agent_step.tools.sse_bridge", "app.agent.streaming.sse_bridge"),
    ("app.agent_step.tools.run_tool_use", "app.agent.tools.run_tool_use"),
    ("app.agent_step.tools.langchain_bind", "app.agent.tools.langchain_bind"),
    ("app.agent_step.tools.streaming_executor", "app.agent.tools.streaming_executor"),
    ("app.agent_step.tools.result_storage", "app.agent.tools.result_storage"),
    ("app.agent_step.tools.run_tools", "app.agent.tools.run_tools"),
    ("app.agent_step.tools.registry", "app.agent.tools.registry"),
    ("app.agent_step.tools.hooks", "app.agent.tools.hooks"),
    ("app.agent_step.tools.tool", "app.agent.tools.tool"),
    ("app.agent_step.tools", "app.agent.tools"),
    ("app.agent_step.worker.checkpoint", "app.agent.harness.run_checkpoint"),
    ("app.agent_step.worker.content_client", "app.agent.backend.content_run_client"),
    ("app.agent_step.prompting", "app.agent.context.prompting"),
    ("app.agent_step.vfs.chapter_store", "app.agent.backend.chapter_store"),
    ("app.agent_step.vfs.chapter_meta", "app.agent.backend.chapter_meta_impl"),
    ("app.agent_step.vfs.memory_store", "app.agent.backend.memory_store"),
    ("app.agent_step.vfs.memory_catalog", "app.agent.backend.memory_catalog"),
    ("app.agent_step.vfs.memory_document", "app.agent.backend.memory_document"),
    ("app.agent_step.vfs.memory_schema", "app.agent.backend.memory_schema"),
    ("app.agent_step.vfs.memory_write_guard", "app.agent.backend.memory_write_guard"),
    ("app.agent_step.vfs.format", "app.agent.backend.format"),
    ("app.agent_step.vfs", "app.agent.backend"),
    ("app.agent_step.query_loop_support", "app.agent.harness.loop_support"),
    ("app.agent_step.orchestration_contract", "app.agent.harness.orchestration_contract"),
    ("app.agent_step.context_compact_autocompact", "app.agent.context.compact_autocompact"),
    ("app.agent_step.context_compact_micro", "app.agent.context.compact_micro"),
    ("app.agent_step.context_memory_log", "app.agent.context.memory_log"),
    ("app.agent_step.context_compact", "app.agent.context.compact"),
    ("app.agent_step.context_enrich", "app.agent.context.enrich"),
    ("app.agent_step.context_policy", "app.agent.context.policy"),
    ("app.agent_step.context_meter", "app.agent.context.meter"),
    ("app.agent_step.context_usage", "app.agent.context.usage"),
    ("app.agent_step.tool_result_routing", "app.agent.harness.tool_result_routing"),
    ("app.agent_step.tool_orchestration", "app.agent.harness.tool_orchestration"),
    ("app.agent_step.tool_batch_errors", "app.agent.harness.tool_batch_errors"),
    ("app.agent_step.tool_call_mapping", "app.agent.harness.tool_call_mapping"),
    ("app.agent_step.tool_execution", "app.agent.harness.tool_execution"),
    ("app.agent_step.tool_prepare", "app.agent.harness.tool_prepare"),
    ("app.agent_step.tool_display", "app.agent.harness.tool_display"),
    ("app.agent_step.tool_errors", "app.agent.harness.tool_errors"),
    ("app.agent_step.tool_ui", "app.agent.harness.tool_ui"),
    ("app.agent_step.structured_submit", "app.agent.harness.structured_submit"),
    ("app.agent_step.structured_llm", "app.agent.harness.structured_llm"),
    ("app.agent_step.visible_text_channel", "app.agent.harness.visible_text_channel"),
    ("app.agent_step.chapter_body_format", "app.agent.harness.chapter_body_format"),
    ("app.agent_step.routing_protocol", "app.agent.harness.routing_protocol"),
    ("app.agent_step.main_loop_llm", "app.agent.harness.main_loop_llm"),
    ("app.agent_step.subagent_policy", "app.agent.harness.subagent_policy"),
    ("app.agent_step.subagent_sse", "app.agent.harness.subagent_sse"),
    ("app.agent_step.session_title", "app.agent.harness.session_title"),
    ("app.agent_step.choose_defaults", "app.agent.harness.choose_defaults"),
    ("app.agent_step.cc_visibility", "app.agent.harness.cc_visibility"),
    ("app.agent_step.chapter_body", "app.agent.harness.chapter_body"),
    ("app.agent_step.memory_fields", "app.agent.harness.memory_fields"),
    ("app.agent_step.plan_context", "app.agent.harness.plan_context"),
    ("app.agent_step.message_history", "app.agent.harness.message_history"),
    ("app.agent_step.run_session", "app.agent.harness.run_session"),
    ("app.agent_step.intent_message", "app.agent.harness.intent_message"),
    ("app.agent_step.stream_channels", "app.agent.streaming.stream_channels"),
    ("app.agent_step.stream_items", "app.agent.streaming.stream_items"),
    ("app.agent_step.json_stream", "app.agent.streaming.json_stream"),
    ("app.agent_step.llm_parse", "app.agent.harness.llm_parse"),
    ("app.agent_step.llm_trace", "app.agent.harness.llm_trace"),
    ("app.agent_step.subagent", "app.agent.harness.subagent"),
    ("app.agent_step.transcript", "app.agent.harness.transcript"),
    ("app.agent_step.routing", "app.agent.harness.routing"),
    ("app.agent_step.events", "app.agent.harness.events"),
    ("app.agent_step.query_loop", "app.agent.loop"),
    ("app.agent_step.schemas", "app.agent.schemas"),
    ("app.agent_step.router", "app.agent.router"),
    ("app.agent_step.errors", "app.agent.harness.errors"),
    ("app.agent_step", "app.agent"),
]

# chapter_meta shim -> impl
EXTRA_REWRITES = [
    ("app.agent.backend.chapter_meta", "app.agent.backend.chapter_meta_impl"),
]


def move_files() -> None:
    for sub in (
        "harness/worker",
        "harness",
        "context/prompting",
        "context",
        "streaming",
        "backend",
    ):
        (AGENT / sub).mkdir(parents=True, exist_ok=True)

    # prompting tree
    src_prompt = STEP / "prompting"
    dst_prompt = AGENT / "context" / "prompting"
    if src_prompt.exists() and not dst_prompt.exists():
        shutil.copytree(src_prompt, dst_prompt)

    # worker tree
    src_worker = STEP / "worker"
    dst_worker = AGENT / "harness" / "worker"
    if src_worker.exists():
        for f in src_worker.glob("*.py"):
            dst = dst_worker / f.name
            if not dst.exists():
                shutil.copy2(f, dst)

    for src_rel, dst_rel in MOVES:
        src = STEP / src_rel
        dst = AGENT / dst_rel
        if not src.exists():
            print(f"skip missing {src_rel}")
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.exists() and dst_rel in (
            "backend/chapter_meta_impl.py",
            "tools/tool.py",
            "tools/run_tool_use.py",
        ):
            # merge: overwrite shim targets
            pass
        shutil.copy2(src, dst)
        print(f"moved {src_rel} -> {dst_rel}")


def rewrite_tree(base: Path) -> None:
    all_rewrites = IMPORT_REWRITES + EXTRA_REWRITES
    for path in base.rglob("*.py"):
        if "migrate_agent_step" in path.name:
            continue
        text = path.read_text(encoding="utf-8")
        orig = text
        for old, new in all_rewrites:
            text = text.replace(old, new)
        if text != orig:
            path.write_text(text, encoding="utf-8")


def patch_chapter_client() -> None:
    client = AGENT / "backend" / "chapter_client.py"
    client.write_text(
        '"""Chapter CRUD via Content API — direct ID-based client."""\n\n'
        "from app.agent.backend.chapter_store import (\n"
        "    CHAPTER_TITLE_REQUIRED_MSG,\n"
        "    chapter_to_markdown,\n"
        "    delete_chapter,\n"
        "    fetch_chapter_full,\n"
        "    fetch_chapter_read_slice,\n"
        "    fetch_chapter_summaries,\n"
        "    format_persist_failure_message,\n"
        "    normalize_chapter_summary,\n"
        "    persist_chapter_write,\n"
        "    reorder_novel_chapters,\n"
        "    update_chapter_sort_order,\n"
        ")\n\n"
        "__all__ = [\n"
        '    "CHAPTER_TITLE_REQUIRED_MSG",\n'
        '    "chapter_to_markdown",\n'
        '    "delete_chapter",\n'
        '    "fetch_chapter_full",\n'
        '    "fetch_chapter_read_slice",\n'
        '    "fetch_chapter_summaries",\n'
        '    "format_persist_failure_message",\n'
        '    "normalize_chapter_summary",\n'
        '    "persist_chapter_write",\n'
        '    "reorder_novel_chapters",\n'
        '    "update_chapter_sort_order",\n'
        "]\n",
        encoding="utf-8",
    )


def patch_memory_client() -> None:
    store = AGENT / "backend" / "memory_store.py"
    if not store.exists():
        return
    client = AGENT / "backend" / "memory_client.py"
    names = []
    for line in store.read_text(encoding="utf-8").splitlines():
        if line.startswith("async def ") or line.startswith("def "):
            names.append(line.split("(")[0].split()[-1])
    if not names:
        return
    body = '"""Story-memory API client."""\n\nfrom app.agent.backend.memory_store import (\n'
    body += ",\n".join(f"    {n}" for n in sorted(set(names)))
    body += ",\n)\n\n__all__ = [\n"
    body += ",\n".join(f'    "{n}"' for n in sorted(set(names)))
    body += ",\n]\n"
    client.write_text(body, encoding="utf-8")


def patch_chapter_meta_shim() -> None:
    shim = AGENT / "backend" / "chapter_meta.py"
    shim.write_text(
        '"""Chapter metadata helpers."""\n\n'
        "from app.agent.backend.chapter_meta_impl import *  # noqa: F403\n",
        encoding="utf-8",
    )


def create_agent_step_compat() -> None:
    """Thin re-export package so old imports keep working during transition."""
    compat_init = STEP / "__init__.py"
    compat_init.write_text(
        '"""Deprecated — use app.agent.* instead."""\n',
        encoding="utf-8",
    )
    # router shim
    router_shim = (
        '"""Deprecated shim — use app.agent.router."""\n'
        "from app.agent.router import *  # noqa: F403\n"
    )
    (STEP / "router.py").write_text(router_shim, encoding="utf-8")
    loop_shim = (
        '"""Deprecated shim — use app.agent.loop."""\n'
        "from app.agent.loop import *  # noqa: F403\n"
    )
    (STEP / "query_loop.py").write_text(loop_shim, encoding="utf-8")
    schemas_shim = (
        '"""Deprecated shim — use app.agent.schemas."""\n'
        "from app.agent.schemas import *  # noqa: F403\n"
    )
    (STEP / "schemas.py").write_text(schemas_shim, encoding="utf-8")


def create_package_inits() -> None:
    for pkg in ("harness", "context", "streaming"):
        init = AGENT / pkg / "__init__.py"
        if not init.exists():
            init.write_text(f'"""Agent {pkg} package."""\n', encoding="utf-8")
    worker_init = AGENT / "harness" / "worker" / "__init__.py"
    if not worker_init.exists():
        worker_init.write_text('"""Durable worker harness."""\n', encoding="utf-8")


def main() -> None:
    move_files()
    rewrite_tree(APP)
    rewrite_tree(ROOT / "tests")
    rewrite_tree(ROOT / "scripts")
    patch_chapter_client()
    patch_memory_client()
    patch_chapter_meta_shim()
    create_package_inits()
    create_agent_step_compat()
    print("migration done")


if __name__ == "__main__":
    main()
