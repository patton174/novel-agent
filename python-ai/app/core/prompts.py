"""Prompt templates for different generation tasks."""

from typing import Optional


# ============================================================================
# System Prompts
# ============================================================================

REWRITE_SYSTEM = """You are a professional editor specializing in text revision.
Your task is to rewrite the given text according to the user's instructions.
Maintain the core meaning while improving clarity, flow, and impact.

IMPORTANT: You MUST return content in markdown format with proper formatting.

Generate exactly 3 distinct rewrite options with markdown formatting.

Example format:
```markdown
# Option 1

[Rewritten content...]

---

# Option 2

[Rewritten content...]

---

# Option 3

[Rewritten content...]
```
"""


OUTLINE_SYSTEM = """You are a professional novelist and plot architect.
Your task is to create a detailed novel outline based on the provided summary.

IMPORTANT: You MUST return content in markdown format with proper headings and structure.

Generate a comprehensive outline in markdown format including:
1. # 三幕结构 (Three-Act Structure)
2. # 章节大纲 (Chapter Outline)
3. # 角色弧线 (Character Arcs)

Use markdown headers, bullet points, and separators for clear structure."""


DIALOGUE_SYSTEM = """You are a professional dialogue writer specializing in authentic character voices.
Your task is to generate natural, engaging dialogue between two characters.

IMPORTANT: You MUST return content in markdown format.

Consider:
- Each character's personality, background, and speaking style
- The scene context and setting
- The underlying tension or goal in the conversation
- Realistic speech patterns and rhythm

Create dialogue that reveals character and advances the plot.

Use markdown format with scene descriptions in **bold** and dialogue in quotes.
Example:
```markdown
**场景：咖啡馆角落，灯光昏暗**

**张伟**（皱眉）："你确定要这样做？"

**李娜**（冷笑）："没有退路了。"
```
"""


REVIEW_SYSTEM = """You are a professional editor and proofreader.
Your task is to review the provided text and identify issues.

IMPORTANT: You MUST return content in markdown format.

Focus on:
- Grammar and syntax errors
- Awkward phrasing or unclear passages
- Consistency issues (character names, timeline, facts)
- Pacing problems
- Dialogue authenticity
- Show don't tell issues

Provide specific, actionable suggestions in markdown format.

Example:
```markdown
## 问题列表

1. **第3段** - 语序不当，建议调整...
2. **第7段** - 对话不够自然...

## 修改建议

- 将"他很快地跑"改为"他快速地奔跑"
```
"""


# ============================================================================
# User Prompt Templates
# ============================================================================

def rewrite_prompt(original_text: str, instructions: str) -> str:
    """Generate rewrite prompt."""
    return f"""Rewrite the following text according to the instructions provided.

ORIGINAL TEXT:
---
{original_text}
---

INSTRUCTIONS:
{instructions}

Generate 3 distinct rewrite options.

Format your response as:
【Option 1】
...rewritten text...

【Option 2】
...rewritten text...

【Option 3】
...rewritten text..."""


def outline_prompt(summary: str, genre: Optional[str] = None, style: Optional[str] = None) -> str:
    """Generate outline prompt."""
    base = f"""Create a detailed novel outline based on the following summary.

ONE-SENTENCE SUMMARY:
{summary}
"""

    if genre:
        base += f"\nGENRE: {genre}"
    if style:
        base += f"\nSTYLE: {style}"

    base += """

Provide a comprehensive outline including:

# Three-Act Structure

## Act 1 - Setup
- Hook
- Inciting incident
- First plot point

## Act 2 - Confrontation
- Rising action
- Midpoint reversal
- Complications

## Act 3 - Resolution
- Climax
- Falling action
- Resolution

# Chapter Outline
List 20-30 chapters with brief descriptions of each.

# Key Character Arcs
Describe the main character transformations.
"""

    return base


def dialogue_prompt(
    character_a: str,
    character_b: str,
    scene: str,
    context: Optional[str] = None
) -> str:
    """Generate dialogue prompt."""
    base = f"""Write a dialogue scene between {character_a} and {character_b}.

SCENE SETTING:
{scene}
"""

    if context:
        base += f"\n\nADDITIONAL CONTEXT:\n{context}"

    base += """

Write the complete dialogue scene with appropriate narrative beats and action descriptions.
Make the dialogue feel natural and true to each character's personality."""

    return base


def review_prompt(content: str, focus_areas: Optional[list[str]] = None) -> str:
    """Generate review prompt."""
    base = f"""Review the following text and provide detailed feedback.

TEXT TO REVIEW:
---
{content}
---

Provide your analysis in the following format:

## Issues Found
List specific issues with page/section references when possible.

## Suggestions
Provide concrete suggestions for improvement.

## Overall Assessment
Give a brief overall quality assessment.
"""

    if focus_areas:
        base += f"\n\nSPECIFIC AREAS TO FOCUS ON: {', '.join(focus_areas)}"

    return base


# ============================================================================
# Context Assembly
# ============================================================================

CONTEXT_TEMPLATE = """
===
RELATED CONTEXT FROM KNOWLEDGE BASE (for reference):
{context}
===

If the context above is relevant, use it to maintain consistency in your writing.
If it's not relevant, you may ignore it.
"""