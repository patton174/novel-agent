"""T3.3 — legacy BaseAgent / continuer / continue API removed."""

from __future__ import annotations

import importlib

import pytest


def test_base_agent_module_removed():
    with pytest.raises(ModuleNotFoundError):
        importlib.import_module("app.agents.base")


def test_continuer_module_removed():
    with pytest.raises(ModuleNotFoundError):
        importlib.import_module("app.agents.continuer")


def test_generation_service_removed():
    with pytest.raises(ModuleNotFoundError):
        importlib.import_module("app.services.generation")


def test_continue_routes_removed():
    from app.api import routes

    paths = {getattr(r, "path", "") for r in routes.router.routes}
    assert "/ai/continue" not in paths
    assert "/ai/continue/stream" not in paths
