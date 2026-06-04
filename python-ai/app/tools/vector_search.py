"""Vector search — delegates to chapter index when available."""

from typing import Optional

from app.config import settings
from app.rag.chapter_index import search_novel


class VectorSearchError(Exception):
    pass


class VectorSearch:
    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.host = host or settings.milvus_host
        self.port = port or settings.milvus_port
        self.user = user or settings.milvus_user
        self.password = password or settings.milvus_password
        self._connected = True

    async def connect(self) -> bool:
        self._connected = True
        return True

    async def disconnect(self) -> None:
        self._connected = False

    async def search(
        self,
        query: str,
        collection: str = "novel_context",
        top_k: int = 5,
        filters: Optional[dict] = None,
    ) -> list[dict]:
        novel_id = None
        if filters and filters.get("novel_id") is not None:
            novel_id = str(filters["novel_id"])
        if not novel_id:
            return []
        hits = await search_novel(novel_id, query, top_k=top_k)
        return [
            {
                "content": f"[{h.get('title')}] {h.get('content')}",
                "score": h.get("score"),
                "metadata": {"chapter_id": h.get("chapter_id")},
            }
            for h in hits
        ]

    async def get_context_for_novel(
        self,
        novel_id: int | str,
        query: str,
        context_type: str = "all",
        top_k: int = 3,
    ) -> str:
        hits = await search_novel(str(novel_id), query, top_k=top_k)
        if not hits:
            return ""
        lines = [
            f"[{h.get('title')}] (score={h.get('score', 0):.2f}) {h.get('content', '')}"
            for h in hits
        ]
        return "\n\n".join(lines)


vector_search = VectorSearch()
