"""Tests for retrieval query rewrite."""

import json

import pytest

from app.rag.query_rewrite import (
    _lexical_fallback_queries,
    _parse_rewrite_json,
    build_retrieval_query_plan,
)


def test_parse_rewrite_json():
    raw = json.dumps(
        {
            "primary": "第三章 林动 突破",
            "variants": ["林动突破情节", "第三卷修炼"],
            "keywords": ["林动", "突破", "第三章"],
        },
        ensure_ascii=False,
    )
    plan = _parse_rewrite_json(raw, user_message="续写第三章林动突破", variant_count=3)
    assert plan is not None
    assert plan.primary == "第三章 林动 突破"
    assert len(plan.variants) == 2
    assert plan.keywords[0] == "林动"


def test_lexical_fallback_generates_variants():
    plan = _lexical_fallback_queries("续写第三章林动突破描写", variant_count=2)
    assert plan.rewrite_source == "lexical_fallback"
    assert plan.primary
    assert plan.all_queries(max_queries=4)


@pytest.mark.asyncio
async def test_build_retrieval_query_plan_fallback_when_llm_disabled(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "agent_session_query_rewrite_enabled", False)
    plan = await build_retrieval_query_plan(user_message="查找上次章节审计结果")
    assert plan.rewrite_source == "lexical_fallback"
    assert "查找上次章节审计结果" in plan.all_queries()


@pytest.mark.asyncio
async def test_build_retrieval_query_plan_uses_llm(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "agent_session_query_rewrite_enabled", True)

    class _FakeLLM:
        async def ainvoke(self, messages):
            class _R:
                content = json.dumps(
                    {
                        "primary": "chapter audit prior run",
                        "variants": ["上次 ChapterAudit", "章节审查记录"],
                        "keywords": ["ChapterAudit", "审计"],
                    }
                )

            return _R()

    monkeypatch.setattr(
        "app.rag.query_rewrite.llm_provider.get_llm",
        lambda profile="fast": _FakeLLM(),
    )
    plan = await build_retrieval_query_plan(user_message="之前审计说了啥")
    assert plan.rewrite_source == "llm"
    assert plan.primary == "chapter audit prior run"
    assert len(plan.variants) >= 1
