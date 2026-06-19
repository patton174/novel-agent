# Part 2b — MQ + python-ai 实现计划（续）

> 主索引：[2026-06-19-file-upload.md](./2026-06-19-file-upload.md) ｜ [Part 2a](./2026-06-19-file-upload-part2a-mq-python.md)
> 设计：[spec part2](../specs/2026-06-19-file-upload-design-part2.md)
> **依赖 Part1 Task 9**（UploadService 引用 `MqTopic.FILE_PARSE` + `FileParseMessage`），故 Task 13/14 须在 Part1 Task 9 之前完成。

**约定**：Java 21；python 测试 `cd python-ai && python -m pytest tests/test_parse_*.py -q`。

---

## Task 17: python-ai 解析模型 + text_parser

**Files:**
- Create: `python-ai/app/parse/__init__.py`
- Create: `python-ai/app/parse/models.py`
- Create: `python-ai/app/parse/text_parser.py`
- Test: `python-ai/tests/test_parse_text.py`

- [ ] **Step 1: 写 models.py**

```python
"""解析结果模型。"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ParsedChapter(BaseModel):
    title: str
    content: str
    sort_order: int


class ParseResult(BaseModel):
    title: str = ""
    chapters: list[ParsedChapter] = Field(default_factory=list)
    text: str = ""
    error: str | None = None
    detail: str | None = None
```

- [ ] **Step 2: 写失败测试 test_parse_text.py**

```python
"""text_parser 单测。"""

from __future__ import annotations

from app.parse.text_parser import parse_text


def test_parse_txt_plain():
    result = parse_text("第一章 醒来\n\n正文内容。".encode("utf-8"), "txt", "醒.txt")
    assert result.error is None
    assert result.title == "醒.txt"
    assert result.chapters
    assert "正文内容" in result.chapters[0].content


def test_parse_md_strips_markup():
    md = b"# 标题\n\n**粗体** 普通文本"
    result = parse_text(md, "md", "a.md")
    assert result.error is None
    assert "粗体" in result.text or any("粗体" in c.content for c in result.chapters)
    assert "#" not in (result.text or "".join(c.content for c in result.chapters))


def test_parse_invalid_encoding():
    # 非 utf-8 字节不应崩，应尽力返回
    result = parse_text(b"\xff\xfe\x00", "txt", "a.txt")
    # 不报错即可
    assert result.error is None
```

- [ ] **Step 3: 跑测试验证失败**

```bash
cd python-ai && python -m pytest tests/test_parse_text.py -q
```
Expected: FAIL（模块不存在）。

- [ ] **Step 4: 写 text_parser.py**

```python
"""txt/md 解析器。"""

from __future__ import annotations

import re

from app.parse.models import ParseResult, ParsedChapter

_CHAPTER_RE = re.compile(r"^\s*(第[\s\S]{1,12}[章节回卷])\s*(.*)$", re.MULTILINE)
_MD_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$", re.MULTILINE)
_MD_EMPHASIS = [
    (re.compile(r"\*\*([^*]+)\*\*"), r"\1"),
    (re.compile(r"\*([^*]+)\*"), r"\1"),
    (re.compile(r"`([^`]+)`"), r"\1"),
]


def _decode(raw: bytes) -> str:
    for enc in ("utf-8", "gbk", "gb18030", "utf-16"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="ignore")


def _strip_md(text: str) -> str:
    out = text
    for pat, repl in _MD_EMPHASIS:
        out = pat.sub(repl, out)
    out = _MD_HEADING_RE.sub(r"\2", out)
    return out


def _split_chapters(text: str) -> list[tuple[str, str]]:
    matches = list(_CHAPTER_RE.finditer(text))
    if not matches:
        return []
    chapters = []
    for i, m in enumerate(matches):
        title = (m.group(1) + " " + m.group(2)).strip() if m.group(2) else m.group(1)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chapters.append((title, text[start:end].strip()))
    return chapters


def parse_text(raw: bytes, fmt: str, original_name: str) -> ParseResult:
    text = _decode(raw)
    if fmt == "md":
        text = _strip_md(text)
    title = original_name.rsplit(".", 1)[0] if "." in original_name else original_name
    chapters = _split_chapters(text)
    if chapters:
        return ParseResult(
            title=title,
            chapters=[ParsedChapter(title=t, content=c, sort_order=i + 1) for i, (t, c) in enumerate(chapters)],
        )
    return ParseResult(title=title, text=text.strip())
```

- [ ] **Step 5: 写 __init__.py**

```python
# empty package marker
```

- [ ] **Step 6: 跑测试验证通过**

```bash
cd python-ai && python -m pytest tests/test_parse_text.py -q
```
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add python-ai/app/parse/__init__.py python-ai/app/parse/models.py python-ai/app/parse/text_parser.py python-ai/tests/test_parse_text.py
git commit -m "feat(parse): text_parser(txt/md) + 模型"
```

---

## Task 18: python-ai epub_parser

**Files:**
- Create: `python-ai/app/parse/epub_parser.py`
- Create: `python-ai/tests/fixtures/epub/sample.epub`（用代码生成或小样本）
- Test: `python-ai/tests/test_parse_epub.py`

> epub 本质 zip，含 `META-INF/container.xml` → opf → spine 顺序的 XHTML。用 zipfile + bs4 提纯。

- [ ] **Step 1: 写失败测试（用代码构造最小 epub）**

```python
"""epub_parser 单测。用代码构造最小合法 epub。"""

from __future__ import annotations

import io
import zipfile

from app.parse.epub_parser import parse_epub


def _build_minimal_epub(title: str, chapters: list[tuple[str, str]]) -> bytes:
    """构造一个最小合法 epub（zip）。"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("mimetype", "application/epub+zip")
        z.writestr("META-INF/container.xml",
            '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
            '<rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>'
            '</rootfiles></container>')
        items = ""
        itemrefs = ""
        for i, (t, c) in enumerate(chapters):
            fname = f"ch{i+1}.xhtml"
            html = f'<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>{t}</title></head><body><h1>{t}</h1><p>{c}</p></body></html>'
            z.writestr(fname, html)
            items += f'<item id="ch{i+1}" href="{fname}" media-type="application/xhtml+xml"/>'
            itemrefs += f'<itemref idref="ch{i+1}"/>'
        z.writestr("content.opf",
            f'<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0">'
            f'<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>{title}</dc:title></metadata>'
            f'<manifest>{items}</manifest><spine>{itemrefs}</spine></package>')
    return buf.getvalue()


def test_parse_epub_extracts_chapters():
    data = _build_minimal_epub("测试书", [("第一章", "内容一"), ("第二章", "内容二")])
    result = parse_epub(data, "test.epub")
    assert result.error is None
    assert len(result.chapters) == 2
    assert "内容一" in result.chapters[0].content
    assert result.chapters[1].sort_order == 2


def test_parse_epub_bad_zip_returns_error():
    result = parse_epub(b"not a zip", "bad.epub")
    assert result.error == "parse_failed"
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 写 epub_parser.py**

```python
"""epub 解析器：zipfile + bs4，按 spine 顺序提纯 XHTML。"""

from __future__ import annotations

import io
import logging
import re
import zipfile
from xml.etree import ElementTree as ET

from bs4 import BeautifulSoup

from app.parse.models import ParseResult, ParsedChapter

logger = logging.getLogger(__name__)

_NSMAP = {
    "c": "urn:oasis:names:tc:opendocument:xmlns:container",
    "opf": "http://www.idpf.org/2007/opf",
    "dc": "http://purl.org/dc/elements/1.1/",
}


def _extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style"]):
        tag.decompose()
    return soup.get_text("\n").strip()


def _extract_title(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    h1 = soup.find("h1") or soup.find("title")
    return h1.get_text(strip=True) if h1 else ""


def parse_epub(raw: bytes, original_name: str) -> ParseResult:
    title = original_name.rsplit(".", 1)[0]
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile as e:
        return ParseResult(error="parse_failed", detail=f"bad zip: {e}")

    try:
        container = ET.fromstring(zf.read("META-INF/container.xml"))
        opf_path = container.find(".//c:rootfile", _NSMAP).get("full-path")
        opf = ET.fromstring(zf.read(opf_path))
        dc_title = opf.find(".//dc:title", _NSMAP)
        if dc_title is not None and dc_title.text:
            title = dc_title.text.strip()

        # manifest: id -> href
        manifest = {}
        opf_dir = opf_path.rsplit("/", 1)[0] + "/" if "/" in opf_path else ""
        for item in opf.findall(".//opf:item", _NSMAP):
            manifest[item.get("id")] = opf_dir + item.get("href")

        # spine 顺序
        spine = opf.find(".//opf:spine", _NSMAP)
        chapters = []
        idx = 1
        for itemref in spine.findall("opf:itemref", _NSMAP):
            href = manifest.get(itemref.get("idref"))
            if not href:
                continue
            try:
                html = zf.read(href).decode("utf-8", errors="ignore")
            except KeyError:
                continue
            text = _extract_text(html)
            if not text:
                continue
            ch_title = _extract_title(html) or f"第{idx}章"
            chapters.append(ParsedChapter(title=ch_title, content=text, sort_order=idx))
            idx += 1

        if chapters:
            return ParseResult(title=title, chapters=chapters)
        return ParseResult(title=title, text="")
    except Exception as e:
        logger.warning("epub parse failed: %s", e)
        return ParseResult(error="parse_failed", detail=str(e))
```

- [ ] **Step 4: 跑测试验证通过**

```bash
cd python-ai && python -m pytest tests/test_parse_epub.py -q
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add python-ai/app/parse/epub_parser.py python-ai/tests/test_parse_epub.py
git commit -m "feat(parse): epub_parser(zipfile+bs4，按 spine 顺序)"
```

---

## Task 19: python-ai pdf_parser

**Files:**
- Create: `python-ai/app/parse/pdf_parser.py`
- Test: `python-ai/tests/test_parse_pdf.py`

> 用 pypdf 抽文本。文本型 pdf 直接出文本；扫描型（提取文本为空或极少）返回 `pdf_scan_unsupported`。

- [ ] **Step 1: 写失败测试**

```python
"""pdf_parser 单测。"""

from __future__ import annotations

from app.parse.pdf_parser import parse_pdf


def test_parse_pdf_scan_unsupported_when_no_text(monkeypatch):
    # 模拟扫描型：提取文本为空
    class _FakePage:
        def extract_text(self):
            return ""
    class _FakeReader:
        pages = [_FakePage(), _FakePage()]
    monkeypatch.setattr("app.parse.pdf_parser._build_reader", lambda raw: _FakeReader())
    result = parse_pdf(b"fake", "scan.pdf")
    assert result.error == "pdf_scan_unsupported"


def test_parse_pdf_text_type_extracts(monkeypatch):
    class _FakePage:
        def extract_text(self):
            return "第一章 醒来\n正文段落。"
    class _FakeReader:
        pages = [_FakePage()]
    monkeypatch.setattr("app.parse.pdf_parser._build_reader", lambda raw: _FakeReader())
    result = parse_pdf(b"fake", "a.pdf")
    assert result.error is None
    # 文本型 pdf 切章或单章
    assert result.chapters or result.text
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 写 pdf_parser.py**

```python
"""pdf 解析器（仅文本型）。扫描型返回 pdf_scan_unsupported。"""

from __future__ import annotations

import logging

from pypdf import PdfReader

from app.parse.models import ParseResult, ParsedChapter
from app.parse.text_parser import _split_chapters

logger = logging.getLogger(__name__)

_SCAN_THRESHOLD = 10  # 每页平均字符低于此视为扫描型


def _build_reader(raw: bytes):
    import io
    return PdfReader(io.BytesIO(raw))


def parse_pdf(raw: bytes, original_name: str) -> ParseResult:
    title = original_name.rsplit(".", 1)[0]
    try:
        reader = _build_reader(raw)
    except Exception as e:
        return ParseResult(error="parse_failed", detail=str(e))

    pages = reader.pages or []
    full = "\n".join((p.extract_text() or "") for p in pages)
    if pages and len(full) / max(1, len(pages)) < _SCAN_THRESHOLD:
        return ParseResult(error="pdf_scan_unsupported")

    chapters = _split_chapters(full)
    if chapters:
        return ParseResult(
            title=title,
            chapters=[ParsedChapter(title=t, content=c, sort_order=i + 1) for i, (t, c) in enumerate(chapters)],
        )
    return ParseResult(title=title, text=full.strip())
```

- [ ] **Step 4: 跑测试验证通过**

```bash
cd python-ai && python -m pytest tests/test_parse_pdf.py -q
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add python-ai/app/parse/pdf_parser.py python-ai/tests/test_parse_pdf.py
git commit -m "feat(parse): pdf_parser（文本型；扫描型返回 pdf_scan_unsupported）"
```

---

## Task 20: python-ai docx_parser

**Files:**
- Create: `python-ai/app/parse/docx_parser.py`
- Test: `python-ai/tests/test_parse_docx.py`

> docx 本质 zip，`word/document.xml` 内 `<w:t>` 文本。用 zipfile + ET 提取，按 `<w:p>` 段落聚合并识别标题样式。

- [ ] **Step 1: 写失败测试（构造最小 docx）**

```python
"""docx_parser 单测。构造最小 docx（zip）。"""

from __future__ import annotations

import io
import zipfile

from app.parse.docx_parser import parse_docx


def _build_minimal_docx(title: str, paragraphs: list[str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml",
            '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            '</Types>')
        z.writestr("_rels/.rels",
            '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            '</Relationships>')
        body = "".join(f'<w:p><w:r><w:t>{p}</w:t></w:r></w:p>' for p in paragraphs)
        z.writestr("word/document.xml",
            f'<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            f'<w:body>{body}</w:body></w:document>')
    return buf.getvalue()


def test_parse_docx_extracts_text():
    data = _build_minimal_docx("doc", ["第一章 醒来", "正文内容。"])
    result = parse_docx(data, "a.docx")
    assert result.error is None
    combined = "".join(c.content for c in result.chapters) or result.text
    assert "正文内容" in combined


def test_parse_docx_bad_zip():
    result = parse_docx(b"not zip", "bad.docx")
    assert result.error == "parse_failed"
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 写 docx_parser.py**

```python
"""docx 解析器：zipfile + ET 提取 <w:t>。"""

from __future__ import annotations

import io
import logging
import zipfile
from xml.etree import ElementTree as ET

from app.parse.models import ParseResult, ParsedChapter
from app.parse.text_parser import _split_chapters

logger = logging.getLogger(__name__)

_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def parse_docx(raw: bytes, original_name: str) -> ParseResult:
    title = original_name.rsplit(".", 1)[0]
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
        xml = zf.read("word/document.xml")
    except (zipfile.BadZipFile, KeyError) as e:
        return ParseResult(error="parse_failed", detail=str(e))

    try:
        root = ET.fromstring(xml)
        paragraphs = []
        for p in root.iter(f"{_W}p"):
            texts = [t.text or "" for t in p.iter(f"{_W}t")]
            line = "".join(texts).strip()
            if line:
                paragraphs.append(line)
        full = "\n".join(paragraphs)
        chapters = _split_chapters(full)
        if chapters:
            return ParseResult(
                title=title,
                chapters=[ParsedChapter(title=t, content=c, sort_order=i + 1) for i, (t, c) in enumerate(chapters)],
            )
        return ParseResult(title=title, text=full)
    except Exception as e:
        logger.warning("docx parse failed: %s", e)
        return ParseResult(error="parse_failed", detail=str(e))
```

- [ ] **Step 4: 跑测试验证通过**

```bash
cd python-ai && python -m pytest tests/test_parse_docx.py -q
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add python-ai/app/parse/docx_parser.py python-ai/tests/test_parse_docx.py
git commit -m "feat(parse): docx_parser(zipfile+ET 提取 w:t)"
```

---

## Task 21: dispatcher + parse_routes + 注册 + 进度写

**Files:**
- Create: `python-ai/app/parse/dispatcher.py`
- Create: `python-ai/app/api/parse_routes.py`
- Modify: `python-ai/app/main.py`

- [ ] **Step 1: 写 dispatcher.py**

```python
"""格式分发 + 进度写 Redis。"""

from __future__ import annotations

import logging

from app.core.redis_client import set_parse_progress
from app.parse.docx_parser import parse_docx
from app.parse.epub_parser import parse_epub
from app.parse.models import ParseResult
from app.parse.pdf_parser import parse_pdf
from app.parse.text_parser import parse_text

logger = logging.getLogger(__name__)

_PARSERS = {
    "txt": parse_text,
    "md": parse_text,
    "epub": parse_epub,
    "pdf": parse_pdf,
    "docx": parse_docx,
}


def dispatch(file_id: str, raw: bytes, fmt: str, original_name: str) -> ParseResult:
    set_parse_progress(file_id, 5)
    parser = _PARSERS.get(fmt)
    if parser is None:
        return ParseResult(error="unsupported_format", detail=fmt)
    set_parse_progress(file_id, 20)
    try:
        result = parser(raw, original_name)
    except Exception as e:
        logger.warning("parse dispatch failed fmt=%s err=%s", fmt, e)
        return ParseResult(error="parse_failed", detail=str(e))
    set_parse_progress(file_id, 80)
    return result
```

- [ ] **Step 2: 写 parse_routes.py**

```python
"""/internal/parse 路由。Java 传 multipart 字节流。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile

from app.config import settings
from app.parse.dispatcher import dispatch
from app.parse.models import ParseResult

logger = logging.getLogger(__name__)

internal_router = APIRouter()


def _verify_internal_key(key: str | None) -> None:
    expected = settings.internal_service_key
    if not expected or key != expected:
        raise HTTPException(status_code=403, detail="invalid internal service key")


@internal_router.post("/parse")
async def parse_file(
    file: UploadFile = File(...),
    format: str = Form(...),
    originalName: str = Form(...),
    fileId: str = Form(...),
    x_internal_service_key: str | None = Header(default=None, alias="X-Internal-Service-Key"),
):
    _verify_internal_key(x_internal_service_key)
    raw = await file.read()
    result: ParseResult = dispatch(fileId, raw, format, originalName)
    resp = result.model_dump()
    if result.error:
        # 错误仍返回 200 + error 字段，Java 侧据此置 failed
        return resp
    return resp
```

- [ ] **Step 3: main.py 注册路由**

在 `app/main.py` 的 import 区加：
```python
from app.api.parse_routes import internal_router as parse_internal_router
```
在 `app.include_router(crawler_internal_router, prefix="/internal", ...)` 后加：
```python
app.include_router(parse_internal_router, prefix="/internal", tags=["Parse Internal"])
```

- [ ] **Step 4: 端到端验证（启动 python-ai）**

`_restart-dev-stack.ps1`，确认 python-ai 启动日志含 parse 路由注册。用 curl 测（需 internal key）：
```bash
curl -s -X POST http://127.0.0.1:8000/internal/parse \
  -H "X-Internal-Service-Key: dev-internal-key-change-me" \
  -F "file=@/path/to/test.txt" -F "format=txt" -F "originalName=test.txt" -F "fileId=test123"
```
Expected: 返回 `{"title":"test","chapters":[...],"text":"..."}`，无 error。

- [ ] **Step 5: 提交**

```bash
git add python-ai/app/parse/dispatcher.py python-ai/app/api/parse_routes.py python-ai/app/main.py
git commit -m "feat(parse): dispatcher + /internal/parse 路由 + 进度写 Redis"
```

---

## Task 22: requirements.txt 依赖（已在 Task 16 Step 3 处理）

> 依赖已在 Task 16 Step 3 加入 requirements.txt（redis/pypdf/bs4/html2text/python-multipart）。本任务仅做一次全量回归确认。

- [ ] **Step 1: 全量 python 测试**

```bash
cd python-ai && python -m pytest tests/test_parse_*.py -q
```
Expected: 全 PASS。

- [ ] **Step 2: 提交（若 requirements.txt 已在 Task 16 提交则跳过）**

```bash
git status -- python-ai/requirements.txt
# 若有未提交改动：
git add python-ai/requirements.txt && git commit -m "feat(parse): 依赖收尾"
```

---

Part 2 完成。继续 [Part 3 — 前端](./2026-06-19-file-upload-part3-frontend.md)。
