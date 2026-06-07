"""Light output input normalization."""

from app.agent.context.prompting.output_input import normalize_output_input, resolve_output_mode


def test_resolve_mode_from_end_run():
    assert resolve_output_mode({"end_run": False}) == "progress"
    assert resolve_output_mode({"end_run": True}) == "complete"


def test_resolve_explicit_mode():
    assert resolve_output_mode({"output_mode": "progress", "end_run": False}) == "progress"


def test_normalize_fills_end_run_from_mode():
    out = normalize_output_input({"output_mode": "complete", "task": "总结"})
    assert out["end_run"] is True
    assert out["output_mode"] == "complete"


def test_normalize_conflict_prefers_end_run():
    out = normalize_output_input(
        {"output_mode": "complete", "end_run": False, "task": "x"}
    )
    assert out["end_run"] is False
    assert out["output_mode"] == "progress"
