"""Selector-first chapter extraction tests."""

from app.crawl.engine.content_extract import extract_chapter_via_selector
from app.crawl.fetch.fetch import HtmlBodyPage


def test_extract_chapter_via_selector_id_content():
    html = """
    <html><body>
      <div id="nav">menu</div>
      <div id="content">
        <h1>第一章</h1>
        <p>""" + ("正文段落。" * 30) + """</p>
      </div>
    </body></html>
    """
    page = HtmlBodyPage(body=html)
    hit = extract_chapter_via_selector(page, fallback_title="备用", min_chars=50)
    assert hit is not None
    title, content = hit
    assert "第一章" in title or title == "备用"
    assert len(content) >= 50
    assert "正文段落" in content


def test_extract_handles_deeply_nested_paragraphs():
    """嵌套多段落不应在第一个内部闭合标签处提前截断。"""
    paras = "".join(f"<p>第{i}段正文内容。</p>" for i in range(1, 11))
    html = f"""
    <html><body>
      <div id="content">
        <h1>章节标题</h1>
        <div class="inner"><span>{paras}</span></div>
      </div>
      <div id="footer">版权信息</div>
    </body></html>
    """
    page = HtmlBodyPage(body=html)
    hit = extract_chapter_via_selector(page, fallback_title="备用", min_chars=50)
    assert hit is not None
    _, content = hit
    assert "第1段正文" in content
    assert "第10段正文" in content
    assert "版权信息" not in content  # 不得越界到兄弟节点


def test_extract_class_selector():
    html = """
    <html><body>
      <div class="read-content">""" + ("正文。" * 40) + """</div>
    </body></html>
    """
    page = HtmlBodyPage(body=html)
    hit = extract_chapter_via_selector(page, fallback_title="x", min_chars=50)
    assert hit is not None
    assert "正文" in hit[1]


def test_extract_custom_site_selector_priority():
    html = """
    <html><body>
      <div class="zw">""" + ("自定义容器正文。" * 20) + """</div>
    </body></html>
    """
    page = HtmlBodyPage(body=html)
    hit = extract_chapter_via_selector(
        page, fallback_title="x", site_config={"content_selector": ".zw"}, min_chars=50
    )
    assert hit is not None
    assert "自定义容器正文" in hit[1]


def test_extract_returns_none_when_too_short():
    html = "<html><body><div id='content'>太短</div></body></html>"
    page = HtmlBodyPage(body=html)
    assert extract_chapter_via_selector(page, min_chars=50) is None
