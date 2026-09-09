"""Safe, incremental migration runner for NeuroCraft SQLite database.

Enforces zero-data-loss upgrades:
- Never drops tables or deletes existing data
- Tracks applied migration versions in `schema_migrations`
- Idempotent and transaction-safe
"""

from datetime import UTC, datetime
from typing import Any

from neurocraft_logging import get_logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from neurocraft_api.database import get_engine

logger = get_logger("neurocraft.migrations")


MIGRATIONS: list[dict[str, Any]] = [
    {
        "version": "001_initial_schema",
        "description": "Create initial foundation tables (profiles, scans, findings, capabilities, recon, quantum, reports)",
        "upgrade": """
            CREATE TABLE IF NOT EXISTS profiles (
                id VARCHAR(64) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                display_name VARCHAR(120) NOT NULL,
                role VARCHAR(30) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS ix_profiles_email ON profiles (email);

            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id VARCHAR(64) UNIQUE NOT NULL,
                user_id VARCHAR(64) REFERENCES profiles(id),
                sha256 VARCHAR(64) NOT NULL,
                filename VARCHAR(255) NOT NULL,
                file_size_bytes BIGINT NOT NULL,
                mime_type VARCHAR(120) NOT NULL,
                file_type VARCHAR(50) NOT NULL,
                risk_level VARCHAR(20) NOT NULL,
                risk_score FLOAT NOT NULL,
                engine_status_json TEXT NOT NULL,
                raw_result_json TEXT NOT NULL,
                created_at TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS ix_scans_scan_id ON scans (scan_id);
            CREATE INDEX IF NOT EXISTS ix_scans_user_id ON scans (user_id);
            CREATE INDEX IF NOT EXISTS ix_scans_sha256 ON scans (sha256);
            CREATE INDEX IF NOT EXISTS ix_scans_created_at ON scans (created_at);

            CREATE TABLE IF NOT EXISTS findings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id VARCHAR(64) NOT NULL REFERENCES scans(scan_id) ON DELETE CASCADE,
                finding_id VARCHAR(64) NOT NULL,
                category VARCHAR(64) NOT NULL,
                title VARCHAR(255) NOT NULL,
                severity VARCHAR(20) NOT NULL,
                confidence VARCHAR(20) NOT NULL,
                source_engine VARCHAR(64) NOT NULL,
                evidence_json TEXT DEFAULT '{}'
            );
            CREATE INDEX IF NOT EXISTS ix_findings_scan_id ON findings (scan_id);

            CREATE TABLE IF NOT EXISTS capabilities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id VARCHAR(64) NOT NULL REFERENCES scans(scan_id) ON DELETE CASCADE,
                capability VARCHAR(64) NOT NULL,
                status VARCHAR(20) NOT NULL,
                confidence VARCHAR(20) NOT NULL,
                evidence_json TEXT DEFAULT '[]'
            );
            CREATE INDEX IF NOT EXISTS ix_capabilities_scan_id ON capabilities (scan_id);

            CREATE TABLE IF NOT EXISTS recon_scans (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) REFERENCES profiles(id),
                target VARCHAR(255) NOT NULL,
                status VARCHAR(30) NOT NULL,
                exposure_score FLOAT NOT NULL,
                exposure_level VARCHAR(20) NOT NULL,
                dns_json TEXT DEFAULT '[]',
                tls_json TEXT DEFAULT '{}',
                headers_json TEXT DEFAULT '{}',
                created_at TIMESTAMP,
                completed_at TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS ix_recon_scans_user_id ON recon_scans (user_id);
            CREATE INDEX IF NOT EXISTS ix_recon_scans_target ON recon_scans (target);
            CREATE INDEX IF NOT EXISTS ix_recon_scans_created_at ON recon_scans (created_at);

            CREATE TABLE IF NOT EXISTS recon_assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_id VARCHAR(64) NOT NULL,
                recon_scan_id VARCHAR(64) NOT NULL REFERENCES recon_scans(id) ON DELETE CASCADE,
                hostname VARCHAR(255) NOT NULL,
                asset_type VARCHAR(50) NOT NULL,
                source VARCHAR(50) NOT NULL,
                status VARCHAR(30) DEFAULT 'ACTIVE',
                metadata_json TEXT DEFAULT '{}'
            );
            CREATE INDEX IF NOT EXISTS ix_recon_assets_recon_scan_id ON recon_assets (recon_scan_id);

            CREATE TABLE IF NOT EXISTS recon_findings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                finding_id VARCHAR(64) NOT NULL,
                recon_scan_id VARCHAR(64) NOT NULL REFERENCES recon_scans(id) ON DELETE CASCADE,
                category VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                severity VARCHAR(20) NOT NULL,
                confidence VARCHAR(20) NOT NULL,
                evidence_json TEXT DEFAULT '{}',
                recommendation TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ix_recon_findings_recon_scan_id ON recon_findings (recon_scan_id);

            CREATE TABLE IF NOT EXISTS quantum_simulations (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) REFERENCES profiles(id),
                scenario VARCHAR(50) NOT NULL,
                qubits INTEGER DEFAULT 2,
                shots INTEGER DEFAULT 1024,
                noise_level FLOAT DEFAULT 0.0,
                expected_distribution_json TEXT NOT NULL,
                observed_distribution_json TEXT NOT NULL,
                deviation FLOAT NOT NULL,
                threshold FLOAT NOT NULL,
                verdict VARCHAR(50) NOT NULL,
                explanation TEXT NOT NULL,
                created_at TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS ix_quantum_simulations_user_id ON quantum_simulations (user_id);
            CREATE INDEX IF NOT EXISTS ix_quantum_simulations_created_at ON quantum_simulations (created_at);

            CREATE TABLE IF NOT EXISTS reports (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) REFERENCES profiles(id),
                scan_id VARCHAR(64) REFERENCES scans(scan_id),
                recon_id VARCHAR(64) REFERENCES recon_scans(id),
                quantum_id VARCHAR(64) REFERENCES quantum_simulations(id),
                report_type VARCHAR(30) NOT NULL,
                title VARCHAR(255) NOT NULL,
                summary TEXT NOT NULL,
                content_json TEXT NOT NULL,
                report_hash VARCHAR(64),
                created_at TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS ix_reports_user_id ON reports (user_id);
            CREATE INDEX IF NOT EXISTS ix_reports_created_at ON reports (created_at);
        """,
    },
    {
        "version": "002_add_settings",
        "description": "Create persistent local settings table",
        "upgrade": """
            CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) REFERENCES profiles(id),
                value_json TEXT NOT NULL,
                updated_at TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS ix_settings_user_id ON settings (user_id);
        """,
    },
]


async def ensure_migration_table(conn: AsyncConnection) -> None:
    """Create schema_migrations table if not exists."""
    await conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(64) PRIMARY KEY,
                description VARCHAR(255),
                applied_at TIMESTAMP NOT NULL
            );
            """
        )
    )


async def get_applied_versions(conn: AsyncConnection) -> set[str]:
    """Retrieve set of applied migration versions."""
    res = await conn.execute(text("SELECT version FROM schema_migrations;"))
    return {row[0] for row in res.fetchall()}


async def run_migrations(engine: AsyncEngine | None = None) -> list[str]:
    """
    Run all pending incremental migrations safely.
    Returns list of newly applied migration versions.
    """
    eng = engine or get_engine()
    applied_now: list[str] = []

    async with eng.begin() as conn:
        await ensure_migration_table(conn)
        applied = await get_applied_versions(conn)

        for migration in MIGRATIONS:
            ver = migration["version"]
            if ver not in applied:
                logger.info(f"Applying migration '{ver}': {migration['description']}")
                raw_sql = migration["upgrade"]
                for statement in raw_sql.strip().split(";"):
                    stmt = statement.strip()
                    if stmt:
                        await conn.execute(text(stmt))

                now_ts = datetime.now(UTC)
                await conn.execute(
                    text(
                        "INSERT INTO schema_migrations (version, description, applied_at) VALUES (:ver, :desc, :ts);"
                    ),
                    {"ver": ver, "desc": migration["description"], "ts": now_ts},
                )
                applied_now.append(ver)
                logger.info(f"Migration '{ver}' applied successfully.")

    return applied_now
