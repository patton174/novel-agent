"""Content filtering tool for sensitive word detection."""

import re
from typing import Set


class ContentFilter:
    """
    Content filter for detecting and filtering sensitive content.

    Uses a simple keyword-based approach for demonstration.
    In production, use a more comprehensive solution.
    """

    # Basic problematic content patterns (simplified for demonstration)
    # In production, use a comprehensive sensitive word database
    SENSITIVE_PATTERNS: Set[str] = {
        # Add sensitive patterns here - this is a minimal example
        # "example_pattern",
    }

    def __init__(self):
        self._patterns = self.SENSITIVE_PATTERNS

    def contains_problematic_content(self, text: str) -> bool:
        """
        Check if text contains problematic content.

        Args:
            text: Input text to check

        Returns:
            True if problematic content is detected, False otherwise
        """
        text_lower = text.lower()

        for pattern in self._patterns:
            if pattern.lower() in text_lower:
                return True

        return False

    def filter_text(self, text: str) -> str:
        """
        Filter problematic content from text.

        Currently just returns text as-is.
        Extend this method to implement actual filtering.

        Args:
            text: Input text to filter

        Returns:
            Filtered text
        """
        # For now, just return the text as-is
        # In production, implement actual filtering logic
        return text

    def add_pattern(self, pattern: str) -> None:
        """Add a new pattern to the filter."""
        self._patterns.add(pattern)

    def remove_pattern(self, pattern: str) -> None:
        """Remove a pattern from the filter."""
        self._patterns.discard(pattern)


class TrieNode:
    """Trie node for efficient sensitive word matching."""

    def __init__(self):
        self.children: dict[str, TrieNode] = {}
        self.is_end: bool = False


class SensitiveWordFilter:
    """
    Trie-based sensitive word filter for efficient pattern matching.

    More efficient than simple set lookup for large vocabularies.
    """

    def __init__(self):
        self.root = TrieNode()

    def add_word(self, word: str) -> None:
        """Add a word to the filter."""
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True

    def add_words(self, words: list[str]) -> None:
        """Add multiple words to the filter."""
        for word in words:
            self.add_word(word)

    def contains_word(self, text: str) -> bool:
        """Check if text contains any word from the filter."""
        for i in range(len(text)):
            if self._search_from(text, i):
                return True
        return False

    def _search_from(self, text: str, start: int) -> bool:
        """Search for a word starting from the given position."""
        node = self.root
        for i in range(start, len(text)):
            char = text[i]
            if char not in node.children:
                return False
            node = node.children[char]
            if node.is_end:
                return True
        return False

    def find_all_matches(self, text: str) -> list[str]:
        """Find all matching sensitive words in text."""
        matches = []
        for i in range(len(text)):
            if self._search_from(text, i):
                # Extract the word
                node = self.root
                j = i
                while j < len(text) and text[j] in node.children:
                    node = node.children[text[j]]
                    if node.is_end:
                        matches.append(text[i:j+1])
                    j += 1
        return matches