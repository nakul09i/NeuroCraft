-- NeuroCraft Initial Database Schema (Phase 0 Scaffold)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core analysis scan records
CREATE TABLE IF NOT EXISTS scan_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256 CHAR(64) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    verdict VARCHAR(20) NOT NULL,
    overall_score NUMERIC(5, 2) NOT NULL,
    confidence NUMERIC(3, 2) NOT NULL,
    scan_result_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_records_sha256 ON scan_records (sha256);
CREATE INDEX IF NOT EXISTS idx_scan_records_verdict ON scan_records (verdict);

-- Tamper-evident provenance ledger
CREATE TABLE IF NOT EXISTS provenance_ledger (
    sequence_num BIGSERIAL PRIMARY KEY,
    record_id UUID NOT NULL REFERENCES scan_records(id),
    file_sha256 CHAR(64) NOT NULL,
    evidence_merkle_root CHAR(64) NOT NULL,
    previous_ledger_hash CHAR(64) NOT NULL,
    current_ledger_hash CHAR(64) NOT NULL,
    anchored_to_blockchain BOOLEAN DEFAULT FALSE,
    blockchain_tx_hash VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
