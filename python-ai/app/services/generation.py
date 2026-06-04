"""Generation service for coordinating AI text generation."""

from typing import Optional

from app.agents.continuer import continuation_agent, ContinuationAgent
from app.tools.content_filter import ContentFilter


class GenerationService:
    """
    Service for coordinating text generation tasks.

    Acts as a facade for the various agents and handles
    common concerns like content filtering.
    """

    def __init__(self):
        self.continuation_agent: ContinuationAgent = continuation_agent
        self.content_filter = ContentFilter()

    async def generate_continuation(
        self,
        content: str,
        style: Optional[str] = None,
        word_count: int = 1000,
        novel_id: Optional[int] = None,
    ) -> dict:
        """
        Generate story continuation.

        Args:
            content: Previous chapter content
            style: Optional writing style hint
            word_count: Target word count
            novel_id: Optional novel ID for context

        Returns:
            Dictionary with candidates and metadata
        """
        # Filter input
        if self.content_filter.contains_problematic_content(content):
            return {
                "error": "Input content contains sensitive material",
                "candidates": [],
            }

        # Generate continuation
        candidates = await self.continuation_agent.continue_story(
            content=content,
            style=style,
            word_count=word_count,
            novel_id=novel_id,
        )

        # Filter output
        filtered_candidates = []
        for candidate in candidates:
            filtered_content = self.content_filter.filter_text(candidate["content"])
            filtered_candidates.append({
                "id": candidate["id"],
                "content": filtered_content,
            })

        return {
            "candidates": filtered_candidates,
            "word_count": word_count,
            "used_context": novel_id is not None,
        }


# Global service instance
generation_service = GenerationService()