"""封面提示词请求/响应模型。"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CoverPromptRequest(BaseModel):
    title: str = Field(default="", max_length=200)
    genre: str = Field(default="", max_length=100)
    style: str = Field(default="", max_length=100)
    description: str = Field(default="", max_length=500)
    draft: str = Field(default="", max_length=800)
    style_draft: str = Field(default="", max_length=600)
    scene_draft: str = Field(default="", max_length=1200)
    mode: Literal["generate", "optimize"] = "generate"


class CoverPromptSuggestion(BaseModel):
    style_prompt: str = Field(description="English SD tags, 3D semi-realistic CG poster. No Chinese.")
    scene_prompt: str = Field(
        description="Chinese scene: half-body layout, dark bg, top-third gold title 标题为《title》, lighting."
    )


class CoverPromptResponse(BaseModel):
    style_prompt: str = ""
    scene_prompt: str = ""
    document: str = ""
    image_prompt: str = ""
    prompt: str = ""
