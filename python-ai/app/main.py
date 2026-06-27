"""FastAPI application entry point."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.agent.harness.owner.router import router as owner_router
from app.agent.router import router as agent_step_router
from app.api.library_routes import internal_router as library_internal_router
from app.api.model_routes import internal_router as model_internal_router
from app.api.parse_routes import internal_router as parse_internal_router
from app.api.image_routes import router as image_router
from app.api.kg_routes import internal_router as kg_internal_router
from app.api.kg_routes import router as kg_router
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api", tags=["AI"])
app.include_router(rag_router, prefix="/api", tags=["RAG"])
app.include_router(kg_router, prefix="/api", tags=["KnowledgeGraph"])
app.include_router(image_router, prefix="/api", tags=["Images"])
app.include_router(agent_step_router, prefix="/api", tags=["Agent Step"])
app.include_router(owner_router, prefix="/internal", tags=["Owner Internal"])
app.include_router(parse_internal_router, prefix="/internal", tags=["Parse Internal"])
app.include_router(model_internal_router, prefix="/internal", tags=["Model Internal"])
app.include_router(kg_internal_router, prefix="/internal", tags=["KnowledgeGraph Internal"])
app.include_router(library_internal_router, prefix="/internal", tags=["Library Internal"])


@app.on_event("startup")
async def startup_event():
    """Re-apply logging config after uvicorn overrides it."""
    _setup_logging()
    await _warmup_agent()
    from app.core.model_registry import model_registry

    for model_type in ("embedding", "image"):
        try:
            model_registry.get(model_type)
        except Exception as exc:
            logging.getLogger(__name__).warning(
                "model registry warmup failed type=%s err=%s", model_type, exc
            )


async def _warmup_agent():
    """Pre-load LLM, tool registry, and dependency connections."""
    from app.agent.warmup import warmup_agent_runtime

    await warmup_agent_runtime()
    if settings.agent_llm_trace:
        try:
            from app.agent.harness.llm_trace import _trace_file_path

            logging.getLogger(__name__).info(
                "Agent LLM trace enabled: %s", _trace_file_path()
            )
        except Exception as exc:
            logging.getLogger(__name__).warning("Agent trace path skipped: %s", exc)


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
