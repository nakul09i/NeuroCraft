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
    {
        "version": "003_analysis_engine_fields",
        "description": "Add status, confidence, updated_at to scans and description, weight to findings",
        "upgrade": """
            ALTER TABLE scans ADD COLUMN status VARCHAR(30) DEFAULT 'completed';
            ALTER TABLE scans ADD COLUMN confidence VARCHAR(20) DEFAULT 'HIGH';
            ALTER TABLE scans ADD COLUMN updated_at TIMESTAMP;
            ALTER TABLE findings ADD COLUMN description TEXT DEFAULT '';
            ALTER TABLE findings ADD COLUMN weight FLOAT DEFAULT 0.0;
        """,
    },
    {
        "version": "004_recon_engine_enhancements",
        "description": "Add authorization, target_type, confidence, tech, rdap to recon_scans and observed_at to findings/assets",
        "upgrade": """
            ALTER TABLE recon_scans ADD COLUMN authorization_confirmed BOOLEAN DEFAULT 0;
            ALTER TABLE recon_scans ADD COLUMN target_type VARCHAR(30) DEFAULT 'DOMAIN';
            ALTER TABLE recon_scans ADD COLUMN confidence VARCHAR(20) DEFAULT 'HIGH';
            ALTER TABLE recon_scans ADD COLUMN confidence_score FLOAT DEFAULT 0.90;
            ALTER TABLE recon_scans ADD COLUMN tech_json TEXT DEFAULT '[]';
            ALTER TABLE recon_scans ADD COLUMN rdap_json TEXT DEFAULT '{}';
            ALTER TABLE recon_scans ADD COLUMN limitations_json TEXT DEFAULT '[]';
            ALTER TABLE recon_findings ADD COLUMN source VARCHAR(50) DEFAULT 'RECON';
            ALTER TABLE recon_findings ADD COLUMN observed_at TIMESTAMP;
            ALTER TABLE recon_assets ADD COLUMN observed_at TIMESTAMP;
        """,
    },
    {
        "version": "005_trust_and_integrity",
        "description": "Create persistent file_integrity table with indexes for trust verification",
        "upgrade": """
            CREATE TABLE IF NOT EXISTS file_integrity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id VARCHAR(64) UNIQUE NOT NULL REFERENCES scans(scan_id) ON DELETE CASCADE,
                sha256 VARCHAR(64) NOT NULL,
                sha512 VARCHAR(128),
                sha1 VARCHAR(40),
                reference_hash VARCHAR(128),
                hash_match_status VARCHAR(30) NOT NULL,
                signature_status VARCHAR(30) NOT NULL,
                signer VARCHAR(255),
                issuer VARCHAR(255),
                certificate_valid BOOLEAN,
                integrity_status VARCHAR(30) NOT NULL,
                trust_score FLOAT NOT NULL,
                confidence VARCHAR(20) NOT NULL DEFAULT 'HIGH',
                confidence_score FLOAT NOT NULL DEFAULT 0.90,
                evidence_json TEXT NOT NULL DEFAULT '[]',
                created_at TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS ix_file_integrity_scan_id ON file_integrity (scan_id);
            CREATE INDEX IF NOT EXISTS ix_file_integrity_sha256 ON file_integrity (sha256);
        """,
    },
    {
        "version": "006_history_and_reports",
        "description": "Add performance indexes for scan history search, risk filtering, and status sorting",
        "upgrade": """
            CREATE INDEX IF NOT EXISTS ix_scans_risk_level ON scans (risk_level);
            CREATE INDEX IF NOT EXISTS ix_scans_risk_score ON scans (risk_score);
            CREATE INDEX IF NOT EXISTS ix_scans_status ON scans (status);
            CREATE INDEX IF NOT EXISTS ix_scans_filename ON scans (filename);
            CREATE INDEX IF NOT EXISTS ix_reports_scan_id ON reports (scan_id);
        """,
    },
    {
        "version": "007_sync_queue_and_offline_first",
        "description": "Create persistent sync_queue table with compound indexes for offline-first replication",
        "upgrade": """
            CREATE TABLE IF NOT EXISTS sync_queue (
                id VARCHAR(64) PRIMARY KEY,
                user_id VARCHAR(64) REFERENCES profiles(id) ON DELETE CASCADE,
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(64) NOT NULL,
                operation VARCHAR(20) NOT NULL DEFAULT 'CREATE',
                payload_json TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                attempt_count INTEGER NOT NULL DEFAULT 0,
                max_attempts INTEGER NOT NULL DEFAULT 5,
                last_attempt_at TIMESTAMP,
                next_attempt_at TIMESTAMP,
                error_message TEXT,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ix_sync_queue_user_id ON sync_queue (user_id);
            CREATE INDEX IF NOT EXISTS ix_sync_queue_status ON sync_queue (status);
            CREATE INDEX IF NOT EXISTS ix_sync_queue_entity ON sync_queue (entity_type, entity_id);
            CREATE INDEX IF NOT EXISTS ix_sync_queue_next_attempt ON sync_queue (status, next_attempt_at);
            CREATE INDEX IF NOT EXISTS ix_sync_queue_user_status ON sync_queue (user_id, status);
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
                        try:
                            await conn.execute(text(stmt))
                        except Exception as e:
                            # Handle case where column was already created by create_all
                            if "duplicate column name" in str(e).lower():
                                logger.debug(f"Column already exists: {e}")
                            else:
                                raise

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
