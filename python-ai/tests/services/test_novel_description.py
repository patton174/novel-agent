from app.services.novel_description import (
    NovelDescriptionRequest,
    assemble_novel_description,
    suggest_novel_description,
)


def test_assemble_novel_description():
    text = assemble_novel_description(
        hook="开局神级天赋",
        synopsis="第一段\n第二段",
        worldview="资源为王的大陆",
        protagonist="林逸，觉醒无限资源",
        selling_points="爽文,系统,生存",
    )
    assert "【一句话卖点】开局神级天赋" in text
    assert "【简介】" in text
    assert "第一段" in text
    assert "【世界观】" in text
    assert "【主角】" in text
    assert "【卖点】" in text


async def test_fallback_without_llm(monkeypatch):
    class _Stub:
        is_configured = False

    monkeypatch.setattr("app.services.novel_description.llm_provider", _Stub())
    req = NovelDescriptionRequest(title="测试书名", tags="爽文 单女主")
    resp = await suggest_novel_description(req)
    assert resp.title == "测试书名"
    assert resp.tags == "爽文 单女主"
    assert resp.synopsis
    assert resp.description
    assert 1500 <= resp.target_chapter_words <= 5000
