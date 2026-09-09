"""Secure file ingestion and quarantine staging manager for NeuroCraft."""

import uuid
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path
from typing import BinaryIO

from neurocraft_config import get_config
from neurocraft_security import sanitize_filename, validate_safe_path


class IngestionError(Exception):
    """Raised when file ingestion or quarantine fails."""

    pass


class IngestionManager:
    """Manages untrusted file ingestion, size enforcement, and quarantine lifecycle."""

    def __init__(self, quarantine_dir: Path | None = None, max_size_bytes: int | None = None):
        cfg = get_config()
        self.quarantine_dir = quarantine_dir or cfg.quarantine_dir
        self.max_size_bytes = max_size_bytes or cfg.max_upload_size_bytes
        try:
            self.quarantine_dir.mkdir(parents=True, exist_ok=True)
        except OSError:
            self.quarantine_dir = Path("/tmp/neurocraft_quarantine")
            self.quarantine_dir.mkdir(parents=True, exist_ok=True)

    def prepare_quarantine_path(self, scan_id: str) -> Path:
        """Create a dedicated, isolated file path in the quarantine directory."""
        filename = f"{scan_id}.bin"
        target = validate_safe_path(self.quarantine_dir, Path(filename))
        return target

    def ingest_stream(
        self,
        stream: BinaryIO,
        original_filename: str,
        scan_id: str | None = None,
        chunk_size: int = 64 * 1024,
    ) -> tuple[str, str, Path, int]:
        """
        Stream an incoming file into isolated quarantine storage with strict size checking.
        Returns: (scan_id, sanitized_filename, quarantine_path, total_bytes_written)
        """
        scan_id = scan_id or str(uuid.uuid4())
        clean_name = sanitize_filename(original_filename)
        dest_path = self.prepare_quarantine_path(scan_id)

        total_bytes = 0
        try:
            with open(dest_path, "wb") as f_out:
                while True:
                    chunk = stream.read(chunk_size)
                    if not chunk:
                        break
                    total_bytes += len(chunk)
                    if total_bytes > self.max_size_bytes:
                        raise IngestionError(
                            f"File exceeded maximum allowed upload size of {self.max_size_bytes} bytes."
                        )
                    f_out.write(chunk)
        except Exception:
            # Always clean up partially written file on error
            if dest_path.exists():
                dest_path.unlink(missing_ok=True)
            raise

        return scan_id, clean_name, dest_path, total_bytes

    def ingest_file(
        self,
        src_path: Path,
        original_filename: str | None = None,
        scan_id: str | None = None,
    ) -> tuple[str, str, Path, int]:
        """
        Ingest a file from an existing local filesystem path safely into quarantine.
        """
        if not src_path.exists() or not src_path.is_file():
            raise IngestionError(f"Source file does not exist or is not a file: {src_path}")

        file_size = src_path.stat().st_size
        if file_size > self.max_size_bytes:
            raise IngestionError(
                f"File size ({file_size} bytes) exceeds maximum limit of {self.max_size_bytes} bytes."
            )

        filename = original_filename or src_path.name
        with open(src_path, "rb") as f_in:
            return self.ingest_stream(f_in, filename, scan_id=scan_id)

    def cleanup(self, quarantine_path: Path) -> None:
        """Safely remove a quarantined file."""
        try:
            if quarantine_path.exists():
                quarantine_path.unlink(missing_ok=True)
        except Exception:
            # Don't let cleanup failures crash the calling flow, but raise IngestionError if needed
            pass

    @contextmanager
    def quarantined(
        self,
        stream: BinaryIO,
        original_filename: str,
        scan_id: str | None = None,
    ) -> Generator[tuple[str, str, Path, int], None, None]:
        """
        Context manager that ingests a file and guarantees cleanup on exit.
        """
        scan_id, clean_name, path, size = self.ingest_stream(stream, original_filename, scan_id)
        try:
            yield scan_id, clean_name, path, size
        finally:
            self.cleanup(path)
