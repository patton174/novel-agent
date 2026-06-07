"""T3.1 — choice_gate/novel_graph removed; RunSession is the interaction gate."""

from __future__ import annotations

import asyncio
import importlib

import pytest

from app.agent.harness.run_session import RunSession


def test_choice_gate_module_removed():
    with pytest.raises(ModuleNotFoundError):
        importlib.import_module("app.agents.choice_gate")


def test_novel_graph_module_removed():
    with pytest.raises(ModuleNotFoundError):
        importlib.import_module("app.agents.novel_graph")


@pytest.mark.asyncio
async def test_run_session_submit_and_wait():
    session = RunSession("run-1")
    fut = asyncio.create_task(session.wait_interaction())
    await asyncio.sleep(0.01)
    assert session.submit_interaction({"selected_choice": "A"})
    payload = await fut
    assert payload["selected_choice"] == "A"
