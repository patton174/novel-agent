"""Worker slice control flow."""


class WorkerSliceWaiting(Exception):
    """Raised when worker slice must pause for user interaction."""
