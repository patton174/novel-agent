"""Continuation agent for chapter writing."""

from typing import Optional

from app.agents.base import BaseAgent, AgentError
from app.core.prompts import (
    CONTINUATION_SYSTEM,
    continuation_prompt,
)


class ContinuationAgent(BaseAgent):
    """
    Agent specialized in continuing chapter content.

    Maintains narrative consistency and generates multiple
    continuation options for user selection.
    """

    @property
    def system_prompt(self) -> str:
        return CONTINUATION_SYSTEM

    @property
    def task_name(self) -> str:
        return "Story Continuation"

    async def continue_story(
        self,
        content: str,
        style: Optional[str] = None,
        word_count: int = 1000,
        novel_id: Optional[int] = None,
    ) -> list[dict]:
        """
        Continue a story from the provided content.

        Args:
            content: Previous chapter content
            style: Optional writing style hint
            word_count: Target word count for continuation
            novel_id: Optional novel ID for context retrieval

        Returns:
            List of continuation candidates

        Raises:
            AgentError: If continuation fails
        """
        prompt = continuation_prompt(content, style, word_count)

        try:
            response = await self.execute(
                prompt=prompt,
                context={"type": "chapter_summary", "top_k": 3},
                novel_id=novel_id,
            )
            return self._parse_response(response, count=3)
        except Exception as e:
            raise AgentError(f"Failed to continue story: {e}") from e

    def _get_temperature(self) -> float:
        """Get generation temperature for continuation."""
        return 0.7


# Global agent instance
continuation_agent = ContinuationAgent()