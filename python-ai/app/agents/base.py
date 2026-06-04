"""Base agent class for novel writing tasks."""

from abc import ABC, abstractmethod
from typing import Optional
from app.core.llm import generate_text, LLMError
from app.tools.vector_search import vector_search, VectorSearchError


class AgentError(Exception):
    """Base exception for agent-related errors."""
    pass


class BaseAgent(ABC):
    """
    Abstract base class for all novel writing agents.

    Each agent implements a specific writing task like continuation,
    rewriting, outline generation, etc.
    """

    def __init__(self):
        self.vector_search = vector_search

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """Return the system prompt for this agent."""
        pass

    @property
    @abstractmethod
    def task_name(self) -> str:
        """Return the task name for this agent."""
        pass

    async def execute(
        self,
        prompt: str,
        context: Optional[dict] = None,
        novel_id: Optional[int] = None,
    ) -> str:
        """
        Execute the agent task.

        Args:
            prompt: User prompt/input
            context: Optional context dictionary with additional parameters
            novel_id: Optional novel ID for vector search

        Returns:
            Generated text result
        """
        # Try to enrich with vector context if novel_id provided
        enriched_prompt = prompt
        used_context = False

        if novel_id and context:
            try:
                context_text = await self._get_relevant_context(
                    novel_id=novel_id,
                    query=prompt,
                    context=context,
                )
                if context_text:
                    enriched_prompt = self._enrich_prompt(prompt, context_text)
                    used_context = True
            except VectorSearchError:
                # Degrade gracefully - continue without vector context
                pass

        try:
            result = await generate_text(
                prompt=enriched_prompt,
                system_message=self.system_prompt,
                temperature=self._get_temperature(),
            )
            return result
        except LLMError as e:
            raise AgentError(f"{self.task_name} failed: {e}") from e

    async def _get_relevant_context(
        self,
        novel_id: int,
        query: str,
        context: dict,
    ) -> str:
        """
        Retrieve relevant context from vector database.

        Args:
            novel_id: Novel ID
            query: Search query
            context: Context configuration

        Returns:
            Formatted context string
        """
        context_type = context.get("type", "all")
        top_k = context.get("top_k", 3)

        return await self.vector_search.get_context_for_novel(
            novel_id=novel_id,
            query=query,
            context_type=context_type,
            top_k=top_k,
        )

    def _enrich_prompt(self, prompt: str, context: str) -> str:
        """
        Enrich prompt with retrieved context.

        Args:
            prompt: Original prompt
            context: Retrieved context

        Returns:
            Enriched prompt
        """
        from app.core.prompts import CONTEXT_TEMPLATE
        return f"{prompt}\n\n{CONTEXT_TEMPLATE.format(context=context)}"

    def _get_temperature(self) -> float:
        """
        Get the temperature for LLM generation.

        Returns:
            Temperature value (0.0 to 1.0)
        """
        return 0.7

    def _parse_response(self, response: str, count: int = 3) -> list[dict]:
        """
        Parse LLM response into structured candidates.

        Args:
            response: Raw LLM response
            count: Expected number of candidates

        Returns:
            List of candidate dictionaries
        """
        # Default implementation - can be overridden by subclasses
        candidates = []
        lines = response.strip().split('\n')

        current_content = []
        current_id = None

        for line in lines:
            line = line.strip()
            if not line:
                continue

            if line.startswith('【') or line.startswith('['):
                if current_id is not None and current_content:
                    candidates.append({
                        "id": current_id,
                        "content": '\n'.join(current_content).strip(),
                    })

                if '1' in line:
                    current_id = 1
                elif '2' in line:
                    current_id = 2
                elif '3' in line:
                    current_id = 3
                else:
                    current_id = len(candidates) + 1

                current_content = []
            else:
                current_content.append(line)

        if current_id is not None and current_content:
            candidates.append({
                "id": current_id,
                "content": '\n'.join(current_content).strip(),
            })

        if not candidates:
            candidates.append({
                "id": 1,
                "content": response.strip(),
            })

        return candidates[:count]