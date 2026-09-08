"""Core scanner orchestrator executing the end-to-end static pipeline."""

import time
from pathlib import Path

from neurocraft_logging import get_logger
from neurocraft_risk import DeterministicRiskEngine
from neurocraft_types import (
    ConfidenceEnum,
    EngineStatusEnum,
    FileTypeEnum,
    Finding,
    ScanResult,
    SeverityEnum,
)

from neurocraft_scanner.capabilities import map_capabilities
from neurocraft_scanner.extractors.apk import extract_apk_features
from neurocraft_scanner.extractors.elf import extract_elf_features
from neurocraft_scanner.extractors.generic import extract_generic_features
from neurocraft_scanner.extractors.office import extract_office_features
from neurocraft_scanner.extractors.pdf import extract_pdf_features
from neurocraft_scanner.extractors.pe import extract_pe_features
from neurocraft_scanner.file_type import detect_file_type
from neurocraft_scanner.fingerprint import compute_fingerprint

logger = get_logger("neurocraft.scanner")


class ScannerOrchestrator:
    """Coordinates file ingestion, static inspection, capability mapping, and risk evaluation."""

    def __init__(self, risk_engine: DeterministicRiskEngine | None = None):
        self.risk_engine = risk_engine or DeterministicRiskEngine()

    def scan_file(
        self,
        file_path: Path,
        original_filename: str,
        scan_id: str,
    ) -> ScanResult:
        """
        Execute passive, static analysis pipeline on a quarantined file.
        NEVER executes the file.
        """
        total_start = time.perf_counter()
        logger.info(f"Starting scan for {original_filename} (scan_id: {scan_id})")

        # 1. Fingerprinting
        fp_start = time.perf_counter()
        fp_result = compute_fingerprint(file_path, scan_id=scan_id)
        fp_duration = round((time.perf_counter() - fp_start) * 1000, 2)

        # 2. File Type Detection
        ft_start = time.perf_counter()
        file_type_info = detect_file_type(file_path, filename=original_filename)
        ft_duration = round((time.perf_counter() - ft_start) * 1000, 2)

        # Read first 16 bytes for magic bytes representation
        with open(file_path, "rb") as f:
            magic_bytes_preview = f.read(16).hex().upper()

        # 3. Static Generic Extraction
        ext_start = time.perf_counter()
        generic_features, generic_findings = extract_generic_features(file_path, file_type_info)

        # 4. Format-Specific Static Extraction (with fault isolation)
        specific_features: dict = {}
        format_findings: list[Finding] = []
        format_engine_status = EngineStatusEnum.NOT_SUPPORTED

        if file_type_info.is_supported:
            format_engine_status = EngineStatusEnum.COMPLETED
            try:
                if file_type_info.type == FileTypeEnum.PE:
                    specific_features, format_findings = extract_pe_features(file_path)
                elif file_type_info.type == FileTypeEnum.ELF:
                    specific_features, format_findings = extract_elf_features(file_path)
                elif file_type_info.type == FileTypeEnum.PDF:
                    specific_features, format_findings = extract_pdf_features(file_path)
                elif file_type_info.type == FileTypeEnum.APK:
                    specific_features, format_findings = extract_apk_features(file_path)
                elif file_type_info.type == FileTypeEnum.OFFICE:
                    specific_features, format_findings = extract_office_features(file_path)
                elif file_type_info.type == FileTypeEnum.TEXT:
                    # Text format has no additional binary structure
                    specific_features = {"is_plain_text": True}
            except Exception as exc:
                logger.error(
                    f"Format-specific analysis error for {file_type_info.type.value}: {exc}"
                )
                format_engine_status = EngineStatusEnum.FAILED
                format_findings.append(
                    Finding(
                        id="FIND-EXT-ERR-001",
                        category="PARSER_FAULT",
                        title=f"{file_type_info.type.value} Parser Encountered Exception",
                        description=f"Passive parser failed to extract structured fields: {exc}",
                        severity=SeverityEnum.LOW,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={"error": str(exc)},
                        source_engine=f"{file_type_info.type.value.lower()}_extractor",
                        recommendation="Analyze file with alternative static tools.",
                    )
                )

        ext_duration = round((time.perf_counter() - ext_start) * 1000, 2)

        # 5. Consolidate Findings
        all_findings = generic_findings + format_findings

        # 6. Behavioral Capability Mapping
        capabilities = map_capabilities(file_type_info, generic_features, specific_features)

        # 7. Initial Deterministic Risk Verdict
        risk_verdict = self.risk_engine.calculate_verdict(all_findings, capabilities)

        # 8. Engine Status Reporting (Mandatory: Never show Clean if an engine did not run)
        engine_statuses: dict[str, EngineStatusEnum] = {
            "static_analysis": EngineStatusEnum.COMPLETED,
            "format_analysis": format_engine_status,
            "yara": EngineStatusEnum.NOT_CONFIGURED,
            "clamav": EngineStatusEnum.NOT_CONFIGURED,
            "ml": EngineStatusEnum.NOT_CONFIGURED,
        }

        total_duration = round((time.perf_counter() - total_start) * 1000, 2)
        diagnostics = {
            "fingerprint_time_ms": fp_duration,
            "file_type_time_ms": ft_duration,
            "extraction_time_ms": ext_duration,
            "total_scan_time_ms": total_duration,
        }

        logger.info(
            f"Scan completed for {original_filename}: verdict={risk_verdict.level.value} "
            f"score={risk_verdict.score} (total: {total_duration}ms)"
        )

        return ScanResult(
            scan_id=scan_id,
            filename=original_filename,
            file_size_bytes=fp_result.file_size_bytes,
            mime_type=file_type_info.mime,
            magic_bytes=magic_bytes_preview,
            file_type=file_type_info,
            hashes=fp_result.hashes,
            evidence=all_findings,
            findings=all_findings,
            capabilities=capabilities,
            engines=engine_statuses,
            risk_verdict=risk_verdict,
            diagnostics=diagnostics,
        )
