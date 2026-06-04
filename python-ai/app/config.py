"""Configuration management for Novel AI Service."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    active_provider: str = "openai"

    # Primary LLM (MiniMax: anthropic protocol recommended)
    llm_protocol: str = "anthropic"
    openai_api_key: str = ""
    openai_base_url: Optional[str] = "https://api.minimaxi.com/anthropic"
    openai_model: str = "MiniMax-M2.7-highspeed"
    openai_max_tokens: int = 8192
    openai_timeout: int = 90
    openai_plan_max_tokens: int = 8192
    openai_plan_timeout: int = 120
    openai_temperature: float = 1.0
    llm_prompt_cache: bool = True

    deepseek_api_key: str = ""
    deepseek_base_url: Optional[str] = None
    deepseek_model: str = "deepseek-chat"
    deepseek_max_tokens: int = 4096
    deepseek_timeout: int = 60
    deepseek_temperature: float = 0.7

    milvus_host: str = "localhost"
    milvus_port: int = 19530
    milvus_user: str = ""
    milvus_password: str = ""

    content_base_url: str = "http://127.0.0.1:8091"
    log_level: str = "INFO"
    agent_llm_trace: bool = True
    agent_llm_trace_file: str = ""
    agent_context_window_tokens: int = 200_000
    agent_context_compress_ratio: float = 0.72
    agent_microcompact_ratio: float = 0.55
    agent_microcompact_keep_recent: int = 5
    agent_autocompact_keep_tail_messages: int = 12
    agent_autocompact_max_input_chars: int = 90_000
    agent_subagent_max_turns: int = 20
    agent_subagent_max_depth: int = 1

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    def get_active_llm_config(self) -> dict:
        if self.active_provider == "deepseek":
            return {
                "protocol": "openai",
                "api_key": self.deepseek_api_key,
                "base_url": self.deepseek_base_url,
                "model": self.deepseek_model,
                "max_tokens": self.deepseek_max_tokens,
                "timeout": self.deepseek_timeout,
                "temperature": self.deepseek_temperature,
                "plan_max_tokens": self.deepseek_max_tokens,
                "plan_timeout": max(self.deepseek_timeout, 90),
            }
        return {
            "protocol": self.llm_protocol,
            "api_key": self.openai_api_key,
            "base_url": self.openai_base_url,
            "model": self.openai_model,
            "max_tokens": self.openai_max_tokens,
            "timeout": self.openai_timeout,
            "temperature": self.openai_temperature,
            "plan_max_tokens": self.openai_plan_max_tokens,
            "plan_timeout": self.openai_plan_timeout,
        }

    @property
    def is_llm_configured(self) -> bool:
        return bool(self.get_active_llm_config()["api_key"])

    @property
    def max_tokens(self) -> int:
        return self.openai_max_tokens

    @property
    def request_timeout(self) -> int:
        return self.openai_timeout

    @property
    def default_llm_provider(self) -> str:
        return self.active_provider


settings = Settings()
