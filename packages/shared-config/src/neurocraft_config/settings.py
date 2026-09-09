"""Unified configuration management for NeuroCraft."""

import os
from pathlib import Path

from pydantic import BaseModel, Field


def _safe_int(key: str, default: int) -> int:
    val = os.getenv(key)
    if val is None or not val.strip():
        return default
    try:
        return int(val.strip())
    except (ValueError, TypeError):
        return default


def _safe_float(key: str, default: float) -> float:
    val = os.getenv(key)
    if val is None or not val.strip():
        return default
    try:
        return float(val.strip())
    except (ValueError, TypeError):
        return default


def _safe_bool(key: str, default: bool) -> bool:
    val = os.getenv(key)
    if val is None or not val.strip():
        return default
    return val.strip().lower() in ("true", "1", "yes")


class AppConfig(BaseModel):
    """Core application environment configuration."""

    app_name: str = Field(default_factory=lambda: os.getenv("APP_NAME") or "NeuroCraft")
    app_env: str = Field(default_factory=lambda: os.getenv("APP_ENV") or "development")
    app_debug: bool = Field(default_factory=lambda: _safe_bool("APP_DEBUG", True))
    app_host: str = Field(default_factory=lambda: os.getenv("APP_HOST") or "127.0.0.1")
    app_port: int = Field(default_factory=lambda: _safe_int("APP_PORT", 8000))

    # Security & Quotas
    max_upload_size_bytes: int = Field(
        default_factory=lambda: _safe_int("MAX_UPLOAD_SIZE_BYTES", 100 * 1024 * 1024)
    )
    quarantine_dir: Path = Field(
        default_factory=lambda: Path(
            os.getenv(
                "QUARANTINE_DIR",
                "/tmp/neurocraft_quarantine" if os.getenv("VERCEL") else "./scratch/quarantine",
            ) or ("/tmp/neurocraft_quarantine" if os.getenv("VERCEL") else "./scratch/quarantine")
        )
    )
    scanner_timeout_seconds: int = Field(
        default_factory=lambda: _safe_int("SCANNER_TIMEOUT_SECONDS", 30)
    )

    # Free-First Core Services (Defaults to zero-config local SQLite)
    database_url: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "sqlite+aiosqlite:////tmp/neurocraft.db" if os.getenv("VERCEL") else "sqlite+aiosqlite:///./neurocraft.db",
        ) or ("sqlite+aiosqlite:////tmp/neurocraft.db" if os.getenv("VERCEL") else "sqlite+aiosqlite:///./neurocraft.db")
    )
    redis_url: str = Field(
        default_factory=lambda: os.getenv("REDIS_URL") or "redis://127.0.0.1:6379/0"
    )

    # ClamAV
    clamav_enabled: bool = Field(default_factory=lambda: _safe_bool("CLAMAV_ENABLED", True))
    clamav_host: str = Field(default_factory=lambda: os.getenv("CLAMAV_HOST") or "127.0.0.1")
    clamav_port: int = Field(default_factory=lambda: _safe_int("CLAMAV_PORT", 3310))

    # ML Settings
    ml_engine_enabled: bool = Field(default_factory=lambda: _safe_bool("ML_ENGINE_ENABLED", True))
    ml_execution_provider: str = Field(
        default_factory=lambda: os.getenv("ML_EXECUTION_PROVIDER") or "CPUExecutionProvider"
    )
    ml_decision_threshold: float = Field(
        default_factory=lambda: _safe_float("ML_DECISION_THRESHOLD", 0.75)
    )

    # Authentication & Supabase
    supabase_url: str = Field(default_factory=lambda: os.getenv("SUPABASE_URL", ""))
    supabase_anon_key: str = Field(default_factory=lambda: os.getenv("SUPABASE_ANON_KEY", ""))
    supabase_service_role_key: str = Field(
        default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    )
    supabase_jwt_secret: str = Field(
        default_factory=lambda: os.getenv(
            "SUPABASE_JWT_SECRET", "neurocraft-default-local-jwt-secret-for-dev-only"
        )
    )
    jwt_algorithm: str = Field(default_factory=lambda: os.getenv("JWT_ALGORITHM") or "HS256")
    allowed_origins: str = Field(
        default_factory=lambda: os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
        )
    )

    # Optional Decentralized & External Services
    threat_intel_enabled: bool = Field(
        default_factory=lambda: _safe_bool("THREAT_INTEL_ENABLED", False)
    )
    blockchain_enabled: bool = Field(
        default_factory=lambda: _safe_bool("BLOCKCHAIN_ENABLED", False)
    )


def get_config() -> AppConfig:
    """Retrieve validated application configuration."""
    return AppConfig()
