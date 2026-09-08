"""Security sanitization primitives and path guards for NeuroCraft."""

import os
import re
from pathlib import Path


class SecurityValidationError(ValueError):
    """Raised when an untrusted input fails security constraints."""

    pass


def sanitize_filename(filename: str) -> str:
    """Strip dangerous characters and directory separators from a filename."""
    base = os.path.basename(filename)
    # Remove null bytes, control characters, path delimiters
    cleaned = re.sub(r'[\\/*?:"<>|\x00-\x1f]', "", base)
    cleaned = cleaned.strip(". ")
    if not cleaned:
        return "unnamed_artifact"
    return cleaned


def validate_safe_path(base_dir: Path, untrusted_path: Path) -> Path:
    """
    Ensure untrusted_path resolves strictly within base_dir.
    Raises SecurityValidationError on directory traversal attempts.
    """
    base = base_dir.resolve()
    target = (base_dir / untrusted_path).resolve()
    try:
        target.relative_to(base)
    except ValueError as err:
        raise SecurityValidationError(
            f"Path traversal detected! Attempted path '{untrusted_path}' escapes base directory '{base}'"
        ) from err
    return target


def check_archive_limits(
    compressed_size: int,
    uncompressed_size: int,
    max_ratio: float = 10.0,
    max_uncompressed_bytes: int = 250 * 1024 * 1024,
) -> None:
    """Validate archive expansion limits to prevent zip-bomb denial of service."""
    if uncompressed_size > max_uncompressed_bytes:
        raise SecurityValidationError(
            f"Decompressed size {uncompressed_size} bytes exceeds maximum ceiling of {max_uncompressed_bytes} bytes."
        )
    if compressed_size > 0:
        ratio = uncompressed_size / compressed_size
        if ratio > max_ratio:
            raise SecurityValidationError(
                f"Decompression ratio {ratio:.2f}:1 exceeds safe maximum threshold of {max_ratio}:1."
            )
