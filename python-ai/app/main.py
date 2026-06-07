"""FastAPI application entry point."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.agent.harness.worker.router import router as worker_router
from app.agent.router import router as agent_step_router
from app.api.crawler_routes import internal_router as crawler_internal_router
from app.api.crawler_routes import router as crawler_router
from app.api.image_routes import router as image_router
from app.api.rag_routes import router as rag_router
from app.api.routes import router
from app.config import settings
from app.core.logging_setup import setup_logging
from app.core.metrics import setup_metrics
from app.core.trace_middleware import TraceIdMiddleware


def _setup_logging():
    setup_logging()


app = FastAPI(
    title="Novel AI Service",
    description="AI-powered novel writing assistant service",
    version=__version__,
)

app.add_middleware(TraceIdMiddleware)
setup_metrics(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api", tags=["AI"])
app.include_router(rag_router, prefix="/api", tags=["RAG"])
app.include_router(image_router, prefix="/api", tags=["Images"])
app.include_router(crawler_router, prefix="/api", tags=["Crawler"])
app.include_router(agent_step_router, prefix="/api", tags=["Agent Step"])
app.include_router(worker_router, prefix="/internal", tags=["Worker Internal"])
app.include_router(crawler_internal_router, prefix="/internal", tags=["Crawler Internal"])


@app.on_event("startup")
async def startup_event():
    """Re-apply logging config after uvicorn overrides it."""
    _setup_logging()
    await _warmup_agent()
    from app.crawl.orchestrator.loop import start_orchestrator_background

    start_orchestrator_background()


async def _warmup_agent():
    """Pre-check LLM configuration on startup."""
    try:
        from app.core.llm import llm_provider

        if llm_provider.is_configured:
            logging.getLogger(__name__).info("Agent step executor ready (LLM configured)")
            if settings.agent_llm_trace:
                from app.agent.harness.llm_trace import _trace_file_path

                logging.getLogger(__name__).info(
                    "Agent LLM trace enabled: %s", _trace_file_path()
                )
    except Exception as exc:
        logging.getLogger(__name__).warning("Agent warmup skipped: %s", exc)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Novel AI Service",
        "version": __version__,
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)