"""Structured JSON logger with automated secret redaction for NeuroCraft."""

import json
import logging
import re
from typing import Any

# Patterns matching sensitive keys or strings to redact
SENSITIVE_KEY_PATTERN = re.compile(
    r"(secret|password|token|api[_-]?key|auth|bearer|private[_-]?key)", re.IGNORECASE
)


def redact_sensitive_dict(data: dict[str, Any]) -> dict[str, Any]:
    """Recursively redact sensitive key values."""
    redacted: dict[str, Any] = {}
    for key, value in data.items():
        if SENSITIVE_KEY_PATTERN.search(str(key)):
            redacted[key] = "[REDACTED]"
        elif isinstance(value, dict):
            redacted[key] = redact_sensitive_dict(value)
        elif isinstance(value, list):
            redacted[key] = [redact_sensitive_dict(v) if isinstance(v, dict) else v for v in value]
        else:
            redacted[key] = value
    return redacted


class JsonFormatter(logging.Formatter):
    """Custom logging formatter that outputs JSON records with redaction."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        extra = getattr(record, "extra", None)
        if isinstance(extra, dict):
            log_entry["context"] = redact_sensitive_dict(extra)
        return json.dumps(log_entry)


def get_logger(name: str) -> logging.Logger:
    """Obtain a structured logger for a component."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
