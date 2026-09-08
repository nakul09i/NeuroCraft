"""FastAPI Gateway service for NeuroCraft.

Provides comprehensive REST endpoints for:
- File Scans & Static Evidence Analysis
- Digital Signatures & Authenticode Certificates
- Passive Defensive Reconnaissance
- Quantum Trust Simulation (SIH Key Differentiator)
- Security Reports Synthesis
- User Authentication & Ownership Authorization
"""

import json
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from neurocraft_config import get_config
from neurocraft_logging import get_logger
from neurocraft_quantum import QuantumTrustSimulator
from neurocraft_recon import ReconEngine
from neurocraft_scanner import IngestionError, IngestionManager, ScannerOrchestrator
from neurocraft_types import (
    LoginRequest,
    QuantumSimulationRequest,
    QuantumSimulationResponse,
    ReconScanRequest,
    ReconScanResponse,
    ReportRequest,
    ReportResponse,
    ScanResponse,
    ScanResult,
    SignupRequest,
    TokenResponse,
    UserContext,
    UserProfile,
)

from neurocraft_api.auth import (
    authenticate_user,
    get_current_user,
    get_optional_user,
    register_user,
)
from neurocraft_api.database import (
    get_profile_by_id,
    get_quantum_simulation_by_id,
    get_quantum_simulations_for_user,
    get_recon_scan_by_id,
    get_recon_scans_for_user,
    get_report_by_id,
    get_reports_for_user,
    get_scan_by_id_and_user,
    get_scans_for_user,
    init_db,
    save_quantum_simulation,
    save_recon_scan,
    save_scan_result,
)
from neurocraft_api.reports import ReportGenerator

logger = get_logger("neurocraft.api")
config = get_config()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifecycle startup and shutdown handler."""
    logger.info("Initializing NeuroCraft API database and multi-layer engines...")
    try:
        await init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
    yield
    logger.info("NeuroCraft API shutting down.")


app = FastAPI(
    title="NeuroCraft API",
    version="0.1.0",
    description="Know what you can trust. — AI-assisted, multi-layer cybersecurity platform for file analysis and cryptographic provenance.",
    lifespan=lifespan,
)

# CORS middleware
origins = (
    [origin.strip() for origin in config.allowed_origins.split(",") if origin.strip()]
    if hasattr(config, "allowed_origins")
    else ["*"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Engine Instances
ingestion_mgr = IngestionManager()
scanner_orchestrator = ScannerOrchestrator()
quantum_simulator = QuantumTrustSimulator()
recon_engine = ReconEngine()
report_generator = ReportGenerator()


# ==============================================================================
# Health & Status Endpoints
# ==============================================================================


@app.get("/health", tags=["Health"])
async def root_health() -> dict[str, str]:
    """Basic service health check."""
    return {
        "status": "ok",
        "version": "0.1.0",
        "app_name": config.app_name,
        "environment": config.app_env,
    }


@app.get("/api/v1/health", tags=["Health"])
async def api_health() -> dict[str, Any]:
    """Detailed API gateway health diagnostic check."""
    return {
        "status": "ok",
        "version": "0.1.0",
        "app_name": config.app_name,
        "engines": {
            "static_analysis": "COMPLETED",
            "signatures": "COMPLETED",
            "quantum": "COMPLETED",
            "recon": "COMPLETED",
            "reports": "COMPLETED",
            "yara": "NOT_CONFIGURED",
            "clamav": "NOT_CONFIGURED",
            "ml": "NOT_CONFIGURED",
        },
        "database": "connected",
    }


# ==============================================================================
# Authentication Endpoints
# ==============================================================================


@app.post(
    "/api/v1/auth/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"],
)
async def signup(req: SignupRequest) -> TokenResponse:
    """Register a new user account and return JWT access token."""
    profile, token = await register_user(
        email=req.email,
        password=req.password,
        display_name=req.display_name,
    )
    return TokenResponse(access_token=token, token_type="bearer", user=profile)  # noqa: S106


@app.post(
    "/api/v1/auth/login",
    response_model=TokenResponse,
    tags=["Authentication"],
)
async def login(req: LoginRequest) -> TokenResponse:
    """Authenticate with email and password and return JWT access token."""
    profile, token = await authenticate_user(email=req.email, password=req.password)
    return TokenResponse(access_token=token, token_type="bearer", user=profile)  # noqa: S106


@app.get(
    "/api/v1/auth/me",
    response_model=UserProfile,
    tags=["Authentication"],
)
async def get_current_user_profile(user: UserContext = Depends(get_current_user)) -> UserProfile:
    """Fetch profile of currently authenticated user."""
    rec = await get_profile_by_id(user.user_id)
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")
    return UserProfile(
        id=rec.id,
        email=rec.email,
        display_name=rec.display_name,
        role=rec.role,
        created_at=rec.created_at,
        updated_at=rec.updated_at,
    )


# ==============================================================================
# File Scanning & Analysis Endpoints
# ==============================================================================


@app.post(
    "/api/v1/scans",
    response_model=ScanResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Scans"],
    summary="Upload and scan an untrusted file",
)
async def create_scan(
    file: UploadFile = File(...),
    user: UserContext | None = Depends(get_optional_user),
) -> ScanResponse:
    """
    Ingests an untrusted file into quarantine, runs static analysis and signature verification,
    computes deterministic risk scores, persists metadata, and returns a structured scan result.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename.",
        )

    try:
        user_id = user.user_id if user else None

        # Ingest file stream into isolated quarantine
        scan_id, clean_name, quarantine_path, size_bytes = ingestion_mgr.ingest_stream(
            stream=file.file,
            original_filename=file.filename,
        )

        try:
            # Execute static scanner orchestrator
            scan_result = scanner_orchestrator.scan_file(
                file_path=quarantine_path,
                original_filename=clean_name,
                scan_id=scan_id,
            )
            scan_result.user_id = user_id

            # Persist metadata to database
            await save_scan_result(scan_result, user_id=user_id)

            # Return public structured scan response
            return scan_result.to_response()

        finally:
            # CRITICAL MANDATE: Unconditionally clean up quarantine file
            ingestion_mgr.cleanup(quarantine_path)

    except IngestionError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        ) from err
    except Exception as exc:
        logger.error(f"Internal scan failure for {file.filename}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during static analysis.",
        ) from exc


@app.get(
    "/api/v1/scans",
    tags=["Scans"],
    summary="List recent scans for authenticated user",
)
async def list_scans(
    limit: int = 50,
    user: UserContext | None = Depends(get_optional_user),
) -> list[dict[str, Any]]:
    """List recent scans, enforcing user isolation when authenticated."""
    user_id = user.user_id if user else None
    records = await get_scans_for_user(user_id=user_id, limit=limit)
    return [
        {
            "scan_id": r.scan_id,
            "filename": r.filename,
            "sha256": r.sha256,
            "file_type": r.file_type,
            "file_size_bytes": r.file_size_bytes,
            "risk_score": r.risk_score,
            "risk_level": r.risk_level,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@app.get(
    "/api/v1/scans/{scan_id}",
    response_model=ScanResponse,
    tags=["Scans"],
    summary="Retrieve full scan result by ID",
)
async def get_scan(
    scan_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> ScanResponse:
    """Retrieve full persisted ScanResponse by ID enforcing user isolation."""
    user_id = user.user_id if user else None
    scan_record = await get_scan_by_id_and_user(scan_id, user_id)
    if not scan_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID '{scan_id}' was not found or access is restricted.",
        )

    scan_res = ScanResult.model_validate_json(scan_record.raw_result_json)
    return scan_res.to_response()


# ==============================================================================
# Defensive Passive Reconnaissance Endpoints
# ==============================================================================


@app.post(
    "/api/v1/recon",
    response_model=ReconScanResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Reconnaissance"],
    summary="Execute defensive passive reconnaissance on a domain",
)
async def create_recon_scan(
    req: ReconScanRequest,
    user: UserContext | None = Depends(get_optional_user),
) -> ReconScanResponse:
    """Perform passive DNS, TLS, and HTTP security header analysis on target."""
    if not req.target or len(req.target.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid domain or hostname target is required.",
        )

    user_id = user.user_id if user else None
    recon_res = await recon_engine.scan_target(req.target, user_id=user_id)
    await save_recon_scan(recon_res, user_id=user_id)
    return recon_res


@app.get(
    "/api/v1/recon",
    tags=["Reconnaissance"],
    summary="List reconnaissance scans",
)
async def list_recon_scans(
    limit: int = 50,
    user: UserContext | None = Depends(get_optional_user),
) -> list[dict[str, Any]]:
    """List recent reconnaissance scans for authenticated user."""
    user_id = user.user_id if user else None
    records = await get_recon_scans_for_user(user_id=user_id, limit=limit)
    return [
        {
            "id": r.id,
            "target": r.target,
            "status": r.status,
            "exposure_score": r.exposure_score,
            "exposure_level": r.exposure_level,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@app.get(
    "/api/v1/recon/{recon_id}",
    response_model=ReconScanResponse,
    tags=["Reconnaissance"],
    summary="Retrieve reconnaissance scan report by ID",
)
async def get_recon_scan(
    recon_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> ReconScanResponse:
    """Retrieve full reconnaissance scan results."""
    user_id = user.user_id if user else None
    rec = await get_recon_scan_by_id(recon_id, user_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recon scan '{recon_id}' not found or access denied.",
        )

    dns_list = json.loads(rec.dns_json) if rec.dns_json else []
    tls_dict = json.loads(rec.tls_json) if rec.tls_json else None
    headers_dict = json.loads(rec.headers_json) if rec.headers_json else None

    return ReconScanResponse(
        id=rec.id,
        user_id=rec.user_id,
        target=rec.target,
        status=rec.status,
        exposure_score=rec.exposure_score,
        exposure_level=rec.exposure_level,
        dns_records=dns_list,
        tls_info=tls_dict,
        security_headers=headers_dict,
        assets=[
            {
                "id": a.id,
                "hostname": a.hostname,
                "asset_type": a.asset_type,
                "source": a.source,
                "status": a.status,
                "metadata": json.loads(a.metadata_json) if a.metadata_json else {},
            }
            for a in rec.assets
        ],
        findings=[
            {
                "id": f.id,
                "category": f.category,
                "title": f.title,
                "severity": f.severity,
                "confidence": f.confidence,
                "evidence": json.loads(f.evidence_json) if f.evidence_json else {},
                "recommendation": f.recommendation,
            }
            for f in rec.findings
        ],
        created_at=rec.created_at,
        completed_at=rec.completed_at,
    )


# ==============================================================================
# Quantum Trust Simulation Endpoints (SIH Key Differentiator)
# ==============================================================================


@app.post(
    "/api/v1/quantum/simulations",
    response_model=QuantumSimulationResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Quantum Trust"],
    summary="Execute controlled Quantum Trust simulation scenario",
)
@app.post(
    "/api/v1/quantum/simulate",
    response_model=QuantumSimulationResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_quantum_simulation(
    req: QuantumSimulationRequest,
    user: UserContext | None = Depends(get_optional_user),
) -> QuantumSimulationResponse:
    """
    Executes a reproducible statevector quantum-channel simulation for digital signature verification.
    Clearly labeled: SIMULATED QUANTUM ENVIRONMENT.
    """
    user_id = user.user_id if user else None
    sim_res = quantum_simulator.run_simulation(req, user_id=user_id)
    await save_quantum_simulation(sim_res, user_id=user_id)
    return sim_res


@app.get(
    "/api/v1/quantum/simulations",
    tags=["Quantum Trust"],
    summary="List quantum trust simulations",
)
async def list_quantum_simulations(
    limit: int = 50,
    user: UserContext | None = Depends(get_optional_user),
) -> list[dict[str, Any]]:
    """List recent quantum simulations."""
    user_id = user.user_id if user else None
    records = await get_quantum_simulations_for_user(user_id=user_id, limit=limit)
    return [
        {
            "id": r.id,
            "scenario": r.scenario,
            "deviation": r.deviation,
            "threshold": r.threshold,
            "verdict": r.verdict,
            "is_simulated": True,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@app.get(
    "/api/v1/quantum/simulations/{simulation_id}",
    response_model=QuantumSimulationResponse,
    tags=["Quantum Trust"],
    summary="Retrieve quantum simulation details",
)
async def get_quantum_simulation(
    simulation_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> QuantumSimulationResponse:
    """Retrieve full quantum simulation measurement data and explanation."""
    user_id = user.user_id if user else None
    rec = await get_quantum_simulation_by_id(simulation_id, user_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quantum simulation '{simulation_id}' not found or access denied.",
        )

    return QuantumSimulationResponse(
        id=rec.id,
        user_id=rec.user_id,
        scenario=rec.scenario,
        is_simulated=True,
        environment_badge="SIMULATED QUANTUM ENVIRONMENT",
        expected_distribution=(
            json.loads(rec.expected_distribution_json) if rec.expected_distribution_json else {}
        ),
        observed_distribution=(
            json.loads(rec.observed_distribution_json) if rec.observed_distribution_json else {}
        ),
        deviation=rec.deviation,
        threshold=rec.threshold,
        verdict=rec.verdict,
        explanation=rec.explanation,
        created_at=rec.created_at,
    )


# ==============================================================================
# Security Reports Endpoints
# ==============================================================================


@app.post(
    "/api/v1/reports",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Reports"],
    summary="Generate a consolidated security audit report",
)
async def create_report(
    req: ReportRequest,
    user: UserContext | None = Depends(get_optional_user),
) -> ReportResponse:
    """Generate a multi-engine security report synthesizing Scans, Recon, and Quantum simulations."""
    user_id = user.user_id if user else None
    return await report_generator.generate(req, user_id=user_id)


@app.get(
    "/api/v1/reports",
    tags=["Reports"],
    summary="List security reports",
)
async def list_reports(
    limit: int = 50,
    user: UserContext | None = Depends(get_optional_user),
) -> list[dict[str, Any]]:
    """List recent security reports."""
    user_id = user.user_id if user else None
    records = await get_reports_for_user(user_id=user_id, limit=limit)
    return [
        {
            "id": r.id,
            "title": r.title,
            "report_type": r.report_type,
            "summary": r.summary,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@app.get(
    "/api/v1/reports/{report_id}",
    response_model=ReportResponse,
    tags=["Reports"],
    summary="Retrieve report by ID",
)
async def get_report(
    report_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> ReportResponse:
    """Retrieve full consolidated security report."""
    user_id = user.user_id if user else None
    rec = await get_report_by_id(report_id, user_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found or access denied.",
        )

    return ReportResponse(
        id=rec.id,
        user_id=rec.user_id,
        scan_id=rec.scan_id,
        recon_id=rec.recon_id,
        quantum_id=rec.quantum_id,
        report_type=rec.report_type,
        title=rec.title,
        summary=rec.summary,
        content=json.loads(rec.content_json) if rec.content_json else {},
        created_at=rec.created_at,
    )


# ==============================================================================
# Dashboard Summary Endpoint
# ==============================================================================


@app.get(
    "/api/v1/dashboard/stats",
    tags=["Dashboard"],
    summary="Retrieve aggregated metrics for dashboard",
)
async def get_dashboard_stats(
    user: UserContext | None = Depends(get_optional_user),
) -> dict[str, Any]:
    """Provide high-level cybersecurity overview metrics."""
    user_id = user.user_id if user else None
    scans = await get_scans_for_user(user_id=user_id, limit=100)
    recons = await get_recon_scans_for_user(user_id=user_id, limit=100)
    quants = await get_quantum_simulations_for_user(user_id=user_id, limit=100)

    high_risk_scans = sum(1 for s in scans if s.risk_score >= 60.0)
    avg_risk = round(sum(s.risk_score for s in scans) / len(scans), 1) if scans else 0.0

    return {
        "total_scans": len(scans),
        "critical_threats": high_risk_scans,
        "high_risk_findings": high_risk_scans,
        "average_risk_score": avg_risk,
        "average_exposure": avg_risk,
        "recon_targets": len(recons),
        "recon_scans_count": len(recons),
        "quantum_simulations": len(quants),
        "quantum_simulations_count": len(quants),
        "recent_scans": [
            {
                "scan_id": s.scan_id,
                "filename": s.filename,
                "risk_score": s.risk_score,
                "risk_level": s.risk_level,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in scans[:5]
        ],
    }
