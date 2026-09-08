"""Unified configuration management for NeuroCraft."""

import os
from pathlib import Path

from pydantic import BaseModel, Field


class AppConfig(BaseModel):
    """Core application environment configuration."""

    app_name: str = Field(default_factory=lambda: os.getenv("APP_NAME", "NeuroCraft"))
    app_env: str = Field(default_factory=lambda: os.getenv("APP_ENV", "development"))
    app_debug: bool = Field(
        default_factory=lambda: os.getenv("APP_DEBUG", "true").lower() == "true"
    )
    app_host: str = Field(default_factory=lambda: os.getenv("APP_HOST", "127.0.0.1"))
    app_port: int = Field(default_factory=lambda: int(os.getenv("APP_PORT", "8000")))

    # Security & Quotas
    max_upload_size_bytes: int = Field(
        default_factory=lambda: int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(100 * 1024 * 1024)))
    )
    quarantine_dir: Path = Field(
        default_factory=lambda: Path(os.getenv("QUARANTINE_DIR", "./scratch/quarantine"))
    )
    scanner_timeout_seconds: int = Field(
        default_factory=lambda: int(os.getenv("SCANNER_TIMEOUT_SECONDS", "30"))
    )

    # Free-First Core Services (Defaults to zero-config local SQLite)
    database_url: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "sqlite+aiosqlite:///./neurocraft.db",
        )
    )
    redis_url: str = Field(
        default_factory=lambda: os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    )

    # ClamAV
    clamav_enabled: bool = Field(
        default_factory=lambda: os.getenv("CLAMAV_ENABLED", "true").lower() == "true"
    )
    clamav_host: str = Field(default_factory=lambda: os.getenv("CLAMAV_HOST", "127.0.0.1"))
    clamav_port: int = Field(default_factory=lambda: int(os.getenv("CLAMAV_PORT", "3310")))

    # ML Settings
    ml_engine_enabled: bool = Field(
        default_factory=lambda: os.getenv("ML_ENGINE_ENABLED", "true").lower() == "true"
    )
    ml_execution_provider: str = Field(
        default_factory=lambda: os.getenv("ML_EXECUTION_PROVIDER", "CPUExecutionProvider")
    )
    ml_decision_threshold: float = Field(
        default_factory=lambda: float(os.getenv("ML_DECISION_THRESHOLD", "0.75"))
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
    jwt_algorithm: str = Field(default_factory=lambda: os.getenv("JWT_ALGORITHM", "HS256"))
    allowed_origins: str = Field(
        default_factory=lambda: os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
        )
    )

    # Optional Decentralized & External Services
    threat_intel_enabled: bool = Field(
        default_factory=lambda: os.getenv("THREAT_INTEL_ENABLED", "false").lower() == "true"
    )
    blockchain_enabled: bool = Field(
        default_factory=lambda: os.getenv("BLOCKCHAIN_ENABLED", "false").lower() == "true"
    )


def get_config() -> AppConfig:
    """Retrieve validated application configuration."""
    return AppConfig()
