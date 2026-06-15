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
    rag_embed_fail_fast: bool = True

    # Generic agent tools
    web_search_api_key: str = ""
    web_search_provider: str = "tavily"
    mcp_servers: str = ""
    agent_skills_dir: str = ""
    kg_enabled: bool = False
    rag_hybrid_enabled: bool = True
    rag_rerank_enabled: bool = False

    content_base_url: str = "http://127.0.0.1:8080"
    internal_service_key: str = "dev-internal-key-change-me"
    billing_report_enabled: bool = True
    # Split 栈默认 PyAI :8082；Worker 单体栈 compose 注入 BILLING_REPORT_URL=http://novel-studio:8080
    billing_report_url: str = "http://127.0.0.1:8082"
    worker_id: str = ""
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
    agent_durable_checkpoint: bool = False
    agent_relevance_inject: bool = False
    agent_run_session_ttl_sec: int = 3600

    crawl_request_delay_ms: int = 800
    crawl_http_proxy: str = ""
    crawl_proxy_list: str = ""
    # mihomo 外部控制器：抓取失败时自动切换 selector 组内节点（与 CRAWL_HTTP_PROXY 配合）
    crawl_mihomo_api: str = ""
    crawl_mihomo_secret: str = ""
    crawl_mihomo_proxy_group: str = "🚀 节点选择"
    crawl_mihomo_max_nodes: int = 12
    crawl_mihomo_timeout: float = 8.0
    crawl_mihomo_fail_cooldown_sec: int = 300
    crawl_orchestrator_enabled: bool = False
    crawl_orchestrator_poll_sec: int = 30
    # Scrapling HTTP Fetcher（curl_cffi）
    crawl_impersonate: str = "chrome124"
    crawl_http_retries: int = 2
    crawl_http_timeout: int = 45
    crawl_fetch_concurrency: int = 3
    crawl_browser_fetch_enabled: bool = True
    crawl_prefer_playwright: bool = True
    crawl_browser_concurrency: int = 1
    crawl_browser_timeout_ms: int = 60000
    crawl_tls_retry_direct: bool = True

    # Agnes image generation (OpenAI-compatible Images API)
    agnes_image_api_key: str = ""
    agnes_image_base_url: str = "https://apihub.agnes-ai.com"
    agnes_image_model: str = "agnes-image-2.0-flash"
    agnes_image_timeout: int = 120

    # Crawl subtask LLM (OpenAI-compatible Chat Completions, e.g. Agnes-2.0-Flash)
    crawl_llm_api_key: str = ""
    crawl_llm_base_url: str = "https://apihub.agnes-ai.com/v1"
    crawl_llm_model: str = "agnes-2.0-flash"
    crawl_llm_max_tokens: int = 8192
    crawl_llm_timeout: int = 120
    crawl_llm_temperature: float = 0.7

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

    def get_crawl_llm_config(self) -> dict:
        api_key = self.crawl_llm_api_key.strip() or self.agnes_image_api_key.strip()
        base_url = (self.crawl_llm_base_url or "https://apihub.agnes-ai.com/v1").rstrip("/")
        return {
            "protocol": "openai",
            "api_key": api_key,
            "base_url": base_url,
            "model": self.crawl_llm_model or "agnes-2.0-flash",
            "max_tokens": self.crawl_llm_max_tokens,
            "timeout": self.crawl_llm_timeout,
            "temperature": self.crawl_llm_temperature,
            "plan_max_tokens": self.crawl_llm_max_tokens,
            "plan_timeout": self.crawl_llm_timeout,
            "extra_body": {},
        }

    @property
    def is_llm_configured(self) -> bool:
        return bool(self.get_active_llm_config()["api_key"])

    @property
    def is_crawl_llm_configured(self) -> bool:
        return bool(self.get_crawl_llm_config()["api_key"])

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
