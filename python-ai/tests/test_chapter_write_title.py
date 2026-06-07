"""Chapter Write must use explicit title, not placeholder 新章节."""

from app.agent.backend.chapter_meta import is_valid_chapter_title, resolve_chapter_write_title
from app.agent.schemas import AgentRunContext
from app.agent.tools.chapter_stream import attach_chapter_write_patch, title_from_chapter_markdown


def _ctx(**kwargs) -> AgentRunContext:
    base = dict(
        session_id="s1",
        run_id="run-1",
        message_id="msg-1",
        user_id=1,
        novel_id="n1",
        chapters=[],
    )
    base.update(kwargs)
    return AgentRunContext(**base)


def test_title_from_chapter_markdown_reads_frontmatter():
    body = "---\ntitle: 第一章 入局\n---\n\n　　正文"
    assert title_from_chapter_markdown(body) == "第一章 入局"


def test_resolve_chapter_write_title_rejects_placeholder():
    ctx = _ctx()
    title, err = resolve_chapter_write_title(ctx, chapter_id="", frontmatter_title="新章节")
    assert title is None
    assert err


def test_resolve_chapter_write_title_requires_frontmatter_for_new():
    ctx = _ctx()
    title, err = resolve_chapter_write_title(ctx, chapter_id="", frontmatter_title="")
    assert title is None
    assert "frontmatter" in (err or "")


def test_resolve_chapter_write_title_uses_catalog_for_existing():
    cid = "d071d83d-a058-441b-ab67-847131d3c69a"
    ctx = _ctx(chapters=[{"id": cid, "title": "第三章 风暴", "sort_order": 3}])
    title, err = resolve_chapter_write_title(ctx, chapter_id=cid, frontmatter_title="")
    assert err is None
    assert title == "第三章 风暴"


def test_attach_chapter_write_patch_errors_without_title():
    ctx = _ctx()
    patch = attach_chapter_write_patch(
        {},
        file_path="/novel/n1/chapters/new-id.md",
        content="　　只有正文没有标题",
        ctx=ctx,
    )
    assert patch.get("chapter_write_error")
    assert "chapter_write" not in patch


def test_is_valid_chapter_title():
    assert is_valid_chapter_title("第一章")
    assert not is_valid_chapter_title("新章节")
    assert not is_valid_chapter_title("")
