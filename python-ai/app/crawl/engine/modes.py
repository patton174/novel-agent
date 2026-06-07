"""Fetch mode enum — http / stealth / browser upgrade ladder."""

from __future__ import annotations

from enum import Enum


class FetchMode(str, Enum):
    HTTP = "http"
    STEALTH = "stealth"
    BROWSER = "browser"
