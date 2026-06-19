"""Tests for tool_contract vocabulary and catalog formatters."""

from app.agent.context.compact import format_chapter_catalog_db, format_chapter_window
from app.agent.harness.tool_contract import (
    CHAPTER_ID_FIELD,
    format_chapter_catalog_line,
    format_chapter_window_line,
    registry_tool_names,
    tool_contract_prompt_block,
    tool_description_suffix,
)
from app.agent.schemas import AgentRunContext
from app.agent.tools.schemas import (
    CreateMemoryInput,
    DeleteChapterInput,
    EditChapterInput,
    MoveMemoryInput,
    ReadChapterInput,
    ReorderChaptersInput,
    UpdateMemoryFieldsInput,
    UpdateMemoryContentInput,
    UpdateMemoryMetaInput,
)


def test_chapter_catalog_line_uses_chapter_id_not_id():
    row = {"id": "uuid-1", "title": "第一章", "list_index": 1, "word_count": 100}
    line = format_chapter_catalog_line(row)
    assert "chapter_id=uuid-1" in line
    assert "index=1" in line
    assert "id=uuid" not in line.replace("chapter_id=uuid-1", "")


def test_chapter_window_line_includes_chapter_id():
    row = {"id": "c1", "title": "第一章", "list_index": 2, "word_count": 500}
    line = format_chapter_window_line(row)
    assert CHAPTER_ID_FIELD + "=c1" in line
    assert "index=2" in line


def test_format_chapter_catalog_db_integration():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        chapters=[
            {"id": "uuid-1", "title": "第1章", "list_index": 1, "word_count": 1200},
        ],
    )
    catalog = format_chapter_catalog_db(ctx)
    assert "chapter_id=uuid-1" in catalog
    assert "index=1" in catalog


def test_chapter_window_no_vfs_paths():
    ctx = AgentRunContext(
        run_id="r1",
        session_id="s1",
        message_id="m1",
        user_id=1,
        chapters=[{"id": "c1", "title": "第一章", "list_index": 1, "word_count": 100}],
    )
    window = format_chapter_window(ctx)
    assert "chapter_id=c1" in window
    assert "index.json" not in window


def test_read_chapter_description_has_example():
    desc = tool_description_suffix("ReadChapter")
    assert "chapter_id" in desc
    assert "Example:" in desc


def test_tool_contract_prompt_block():
    block = tool_contract_prompt_block()
    assert "chapter_id" in block
    assert "memory_id" in block


def _one_of_required_sets(schema: dict) -> list[set[str]]:
    return [set(branch.get("required", [])) for branch in schema["oneOf"]]


def test_read_chapter_json_schema_one_of():
    schema = ReadChapterInput.model_json_schema()
    assert "oneOf" in schema
    required = _one_of_required_sets(schema)
    assert {"index"} in required
    assert {"chapter_id"} in required
    assert {"title"} in required
    for branch in schema["oneOf"]:
        props = set(branch.get("properties", {}))
        assert props.issubset({"index", "chapter_id", "title", "offset", "limit"})
        assert branch.get("additionalProperties") is False


def test_edit_chapter_json_schema_one_of():
    schema = EditChapterInput.model_json_schema()
    assert "oneOf" in schema
    required = _one_of_required_sets(schema)
    assert {"index"} in required
    assert {"chapter_id"} in required
    assert {"title"} in required


def test_delete_chapter_json_schema_one_of():
    schema = DeleteChapterInput.model_json_schema()
    assert "oneOf" in schema
    required = _one_of_required_sets(schema)
    assert {"chapter_id"} in required
    assert {"chapter_ids"} in required
    assert {"title"} in required
    assert {"index"} in required
    assert {"dedupe_title"} in required


def test_update_memory_fields_json_schema_one_of():
    schema = UpdateMemoryFieldsInput.model_json_schema()
    assert "oneOf" in schema
    required = _one_of_required_sets(schema)
    assert {"memory_id", "title"} in required
    assert {"memory_id", "style"} in required


def test_update_memory_content_requires_body():
    schema = UpdateMemoryContentInput.model_json_schema()
    assert schema["required"] == ["memory_id", "content"]


def test_update_memory_meta_requires_meta():
    schema = UpdateMemoryMetaInput.model_json_schema()
    assert schema["required"] == ["memory_id", "meta"]


def test_move_memory_json_schema_one_of():
    schema = MoveMemoryInput.model_json_schema()
    assert "oneOf" in schema
    required = _one_of_required_sets(schema)
    assert {"memory_id", "parent_id"} in required
    assert {"memory_id", "sort_order"} in required


def test_create_memory_json_schema_one_of():
    schema = CreateMemoryInput.model_json_schema()
    assert "oneOf" in schema
    required = _one_of_required_sets(schema)
    assert {"node_type", "title"} in required
    assert {"node_type", "title", "parent_id"} in required
    assert {"node_type", "title", "scope"} not in required
    assert len(required) == 2
    node_type_consts = {
        branch["properties"]["node_type"]["const"]
        for branch in schema["oneOf"]
        if branch.get("properties", {}).get("node_type", {}).get("const")
    }
    assert node_type_consts == {"root", "child"}
    child_branch = next(
        b for b in schema["oneOf"] if b["properties"]["node_type"].get("const") == "child"
    )
    parent_id = child_branch["properties"]["parent_id"]
    assert parent_id.get("type") == "string"
    assert "anyOf" not in parent_id
    assert "default" not in parent_id
    for branch in schema["oneOf"]:
        assert branch.get("additionalProperties") is False
        node_type = branch.get("properties", {}).get("node_type", {})
        assert "enum" not in node_type


def test_create_memory_anthropic_bind_tools_preserves_one_of():
    from app.agent.tools.langchain_bind import build_agent_langchain_tools
    from app.core.llm import llm_provider

    tools = build_agent_langchain_tools()
    bound = llm_provider.get_llm(profile="default").bind_tools(tools)
    cm = next(t for t in bound.kwargs["tools"] if t["name"] == "CreateMemory")
    schema = cm["input_schema"]
    assert "oneOf" in schema
    required = _one_of_required_sets(schema)
    assert {"node_type", "title", "parent_id"} in required


def test_reorder_chapters_json_schema_one_of():
    schema = ReorderChaptersInput.model_json_schema()
    assert "oneOf" in schema
    required = _one_of_required_sets(schema)
    assert {"chapter_ids"} in required
    assert {"moves"} in required


def test_all_registry_tools_have_contract():
    names = registry_tool_names()
    from app.agent.harness.tool_contract import TOOL_CONTRACTS

    missing = sorted(names - TOOL_CONTRACTS.keys())
    extra = sorted(TOOL_CONTRACTS.keys() - names)
    assert not missing, f"missing TOOL_CONTRACTS: {missing}"
    assert not extra, f"stale TOOL_CONTRACTS: {extra}"


def test_build_tool_enriches_description():
    from app.agent.tools.tool import build_tool
    from app.agent.tools.schemas import ListMemoryInput

    async def _noop(_ctx, _inp):
        from app.agent.tools.tool import ToolCallResult

        return ToolCallResult(content="")

    tool = build_tool(
        name="ListMemory",
        description="List memory nodes.",
        input_model=ListMemoryInput,
        call=_noop,
    )
    assert "scope" in tool.description
    assert "Example:" in tool.description


def test_system_prompt_aligns_with_tool_contract():
    from app.agent.context.compact import CHAPTER_INFO_CHAIN_FOR_PROMPT
    from app.agent.harness.orchestration_contract import build_main_loop_system_prompt

    prompt = build_main_loop_system_prompt()
    assert "memory_id" in prompt
    assert "chapter_id" in prompt
    assert "CreateMemory" in prompt
    assert "memory_read, ToolSearch" in prompt  # listed as removed, not as available
    assert "chapters/index.json" not in prompt
    assert CHAPTER_INFO_CHAIN_FOR_PROMPT.strip() in prompt
    assert "Never use removed tools" in prompt
