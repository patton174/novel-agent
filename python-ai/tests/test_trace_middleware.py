from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.trace_middleware import TRACE_HEADER, TraceIdMiddleware


def test_trace_id_header_roundtrip():
    app = FastAPI()
    app.add_middleware(TraceIdMiddleware)

    @app.get("/ping")
    def ping():
        return {"ok": True}

    client = TestClient(app)
    response = client.get("/ping", headers={TRACE_HEADER: "abc123"})
    assert response.status_code == 200
    assert response.headers.get(TRACE_HEADER) == "abc123"


def test_trace_id_generated_when_missing():
    app = FastAPI()
    app.add_middleware(TraceIdMiddleware)

    @app.get("/ping")
    def ping():
        return {"ok": True}

    client = TestClient(app)
    response = client.get("/ping")
    trace = response.headers.get(TRACE_HEADER)
    assert trace
    assert len(trace) >= 16
