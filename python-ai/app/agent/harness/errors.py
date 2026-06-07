"""Agent step execution errors — surfaced as step.failed by the executor."""


class StepExecutionError(RuntimeError):
    """Tool step failed after retries; do not synthesize success StepResult."""
