"""Configuration management for Novel AI Service."""


from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    active_provider: str = "openai"

    # Primary LLM (MiniMax: anthropic protocol recommended)
    llm_protocol: str = "anthropic"
    openai_api_key: str = ""
    openai_base_url: str | None = "https://api.minimaxi.com/anthropic"
    openai_model: str = "MiniMax-M2.7-highspeed"
    openai_max_tokens: int = 8192
    openai_timeout: int = 90
    openai_plan_max_tokens: int = 8192
    openai_plan_timeout: int = 120
    openai_temperature: float = 1.0
    llm_prompt_cache: bool = True

    deepseek_api_key: str = ""
    deepseek_base_url: str | None = None
    deepseek_model: str = "deepseek-chat"
    deepseek_max_tokens: int = 4096
    deepseek_timeout: int = 60
    deepseek_temperature: float = 0.7

    milvus_host: str = "localhost"
    milvus_port: int = 19530
    milvus_user: str = ""
    milvus_password: str = ""

    # RAG embedding (independent from chat LLM — DeepSeek has no embedding API)
    rag_embed_provider: str = "openai"
    rag_embed_model: str = "text-embedding-3-small"
    rag_embed_api_key: str = ""
    rag_embed_base_url: str = ""
    rag_embed_group_id: str = ""
    minimax_group_id: str = ""
    rag_embed_fail_fast: bool = True

    # Generic agent tools
    web_search_api_key: str = ""
    web_search_provider: str = "tavily"
    mcp_servers: str = ""
    kg_enabled: bool = False
    rag_hybrid_enabled: bool = True
    rag_rerank_enabled: bool = False

    content_base_url: str = "http://127.0.0.1:8080"
    internal_service_key: str = "dev-internal-key-change-me"
    # Redis：优先用完整 redis_url；脚本（start-local-dev.ps1）注入的是分项 REDIS_HOST/PORT/PASSWORD/DB，
    # 由 redis_url_computed 组装，见下。redis_url 保留为显式覆盖入口。
    redis_url: str = ""
    redis_host: str = "127.0.0.1"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0

    @property
    def redis_url_computed(self) -> str:
        """显式 redis_url 优先；否则从分项 REDIS_HOST/PORT/PASSWORD/DB 组装。"""
        if self.redis_url:
            return self.redis_url
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"
    billing_report_enabled: bool = True
    # Split 栈默认 PyAI :8082；Worker 单体栈 compose 注入 BILLING_REPORT_URL=http://novel-studio:8080
    billing_report_url: str = "http://127.0.0.1:8082"
    worker_id: str = ""
    log_level: str = "INFO"
    agent_llm_trace: bool = True
    agent_llm_trace_file: str = ""
    agent_context_window_tokens: int = 200_000
    agent_context_compress_ratio: float = 0.72  # legacy; autocompact uses CC buffer formula
    agent_tool_result_budget_chars: int = 200_000
    agent_microcompact_trigger_count: int = 15
    agent_microcompact_keep_recent: int = 5
    agent_microcompact_time_based_enabled: bool = False
    agent_microcompact_idle_minutes: int = 60
    agent_autocompact_buffer_tokens: int = 13_000
    agent_autocompact_output_reserve_tokens: int = 20_000
    agent_microcompact_ratio: float = 0.55  # deprecated — use agent_microcompact_trigger_count
    agent_autocompact_keep_tail_messages: int = 12
    agent_autocompact_max_input_chars: int = 90_000
    agent_subagent_max_turns: int = 20
    agent_subagent_max_depth: int = 1
    agent_parallel_subagents: bool = True
    agent_crew_enabled: bool = False
    agent_durable_checkpoint: bool = False
    agent_relevance_inject: bool = False
    agent_session_recall_enabled: bool = False
    agent_session_recall_index_enabled: bool = True
    agent_session_recall_top_k: int = 6
    agent_session_recall_vector_k: int = 24
    agent_session_recall_bm25_k: int = 24
    agent_session_query_rewrite_enabled: bool = True
    agent_session_query_rewrite_variants: int = 3
    agent_session_query_rewrite_max_queries: int = 6
    agent_trace_tool_chain_max: int = 128
    agent_trace_tool_body_max_chars: int = 80_000
    agent_warmup_enabled: bool = True
    agent_warmup_content_ping: bool = True
    agent_warmup_milvus: bool = False
    agent_warmup_llm_ping: bool = False
    agent_run_session_ttl_sec: int = 3600
    # 生产：false → 禁止浏览器直连 /api/agent/run/stream（owner Java 走 /internal/agent/run/stream）
    agent_allow_direct_stream: bool = True

    # --- Agent refactor (AGENT_REFACTOR_PLAN) feature flags，默认 off = 旧行为，逐 flag 灰度 ---
    agent_rf_stream_truth: bool = False       # P1.1 流式写章真值（persist 成功才算成功）
    agent_rf_catalog_version: bool = False    # P1.2 catalog 随写失效 / version
    agent_rf_agent_serial: bool = False       # P1.3 Agent 串行收敛
    agent_rf_error_protocol: bool = False     # P2.3 结构化 ToolError 回灌
    agent_rf_new_timeline: bool = False       # P4 前端新时间线（后端仅透传标记）

    # Agnes image generation (OpenAI-compatible Images API)
    agnes_image_api_key: str = ""
    agnes_image_base_url: str = "https://apihub.agnes-ai.com"
    agnes_image_model: str = "agnes-image-2.0-flash"
    agnes_image_timeout: int = 120

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
