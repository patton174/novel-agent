"""epub 解析器：zipfile + bs4，按 spine 顺序提纯 XHTML。"""

from __future__ import annotations

import io
import logging
import zipfile
from typing import Callable
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


def parse_epub(raw: bytes, original_name: str, on_progress: Callable[[int], None] | None = None) -> ParseResult:
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
        itemrefs = spine.findall("opf:itemref", _NSMAP)
        total = max(1, len(itemrefs))
        chapters = []
        idx = 1
        for n, itemref in enumerate(itemrefs):
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
            if on_progress is not None:
                # spine 进度映射到 0..100
                on_progress(int(100 * (n + 1) / total))

        if chapters:
            return ParseResult(title=title, chapters=chapters)
        return ParseResult(title=title, text="")
    except Exception as e:
        logger.warning("epub parse failed: %s", e)
        return ParseResult(error="parse_failed", detail=str(e))
