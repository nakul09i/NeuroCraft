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
from neurocraft_scanner.extractors.archive import extract_archive_features
from neurocraft_scanner.extractors.elf import extract_elf_features
from neurocraft_scanner.extractors.generic import extract_generic_features
from neurocraft_scanner.extractors.image import extract_image_features
from neurocraft_scanner.extractors.office import extract_office_features
from neurocraft_scanner.extractors.pdf import extract_pdf_features
from neurocraft_scanner.extractors.pe import extract_pe_features
from neurocraft_scanner.extractors.text import extract_text_features
from neurocraft_scanner.file_type import detect_file_type
from neurocraft_scanner.fingerprint import compute_fingerprint
from neurocraft_scanner.signature import SignatureAnalyzer
from neurocraft_scanner.trust import TrustIntegrityEvaluator

logger = get_logger("neurocraft.scanner")


class ScannerOrchestrator:
    """Coordinates file ingestion, static inspection, capability mapping, signature analysis, and risk evaluation."""

    def __init__(
        self,
        risk_engine: DeterministicRiskEngine | None = None,
        signature_analyzer: SignatureAnalyzer | None = None,
        trust_evaluator: TrustIntegrityEvaluator | None = None,
    ):
        self.risk_engine = risk_engine or DeterministicRiskEngine()
        self.signature_analyzer = signature_analyzer or SignatureAnalyzer()
        self.trust_evaluator = trust_evaluator or TrustIntegrityEvaluator()

    def scan_file(
        self,
        file_path: Path,
        original_filename: str,
        scan_id: str,
        reference_hash: str | None = None,
    ) -> ScanResult:
        """
        Execute passive, static analysis pipeline on a quarantined file.
        NEVER executes the file.
        """
        total_start = time.perf_counter()
        logger.info(f"Starting scan for {original_filename} (scan_id: {scan_id})")

        # 1. Fingerprinting (Streaming SHA-256)
        fp_start = time.perf_counter()
        fp_result = compute_fingerprint(file_path, scan_id=scan_id)
        fp_duration = round((time.perf_counter() - fp_start) * 1000, 2)

        # 2. File Type Detection (Strictly Content / Magic Bytes)
        ft_start = time.perf_counter()
        file_type_info = detect_file_type(file_path, filename=original_filename)
        ft_duration = round((time.perf_counter() - ft_start) * 1000, 2)

        # Read first 16 bytes for magic bytes hex representation
        with open(file_path, "rb") as f:
            magic_bytes_preview = f.read(16).hex().upper()

        # 3. Static Generic Extraction (Entropy & String Heuristics with False Positive Controls)
        ext_start = time.perf_counter()
        generic_features, generic_findings = extract_generic_features(file_path, file_type_info)

        # 4. Format-Specific Static Extraction (with fault isolation)
        specific_features: dict = {}
        format_findings: list[Finding] = []
        format_engine_status = EngineStatusEnum.NOT_SUPPORTED
        scan_status = "completed"

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
                elif file_type_info.type == FileTypeEnum.IMAGE:
                    specific_features, format_findings = extract_image_features(file_path)
                elif file_type_info.type == FileTypeEnum.TEXT:
                    specific_features, format_findings = extract_text_features(file_path)
                elif file_type_info.type == FileTypeEnum.ZIP:
                    specific_features, format_findings = extract_archive_features(file_path)
            except Exception as exc:
                logger.error(
                    f"Format-specific analysis error for {file_type_info.type.value}: {exc}"
                )
                format_engine_status = EngineStatusEnum.FAILED
                scan_status = "failed"
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
        else:
            # Honest unsupported format handling (Rule 7: Never pretend unsupported formats are fully analyzed)
            format_engine_status = EngineStatusEnum.NOT_SUPPORTED
            scan_status = "limited"
            format_findings.append(
                Finding(
                    id="FIND-FMT-UNSUPPORTED",
                    category="FORMAT_LIMITATION",
                    title=f"Limited Static Analysis ({file_type_info.type.value})",
                    description=(
                        f"NeuroCraft does not yet feature a specialized deep parser for {file_type_info.type.value} files. "
                        "Cryptographic SHA-256 fingerprinting and generic static heuristics were executed."
                    ),
                    severity=SeverityEnum.INFO,
                    confidence=ConfidenceEnum.LOW,
                    evidence={
                        "detected_type": file_type_info.type.value,
                        "mime": file_type_info.mime,
                        "analysis_status": "limited",
                    },
                    source_engine="orchestrator",
                    recommendation="Perform additional specialized inspection if needed for this format.",
                )
            )

        ext_duration = round((time.perf_counter() - ext_start) * 1000, 2)

        # 5. Digital Signature Analysis (Safe, Evidence-Based)
        sig_start = time.perf_counter()
        sig_info, sig_findings = self.signature_analyzer.analyze(file_path, file_type_info.type)
        sig_duration = round((time.perf_counter() - sig_start) * 1000, 2)

        # 6. Reference Hash Comparison & Integrity Finding
        integrity_findings: list[Finding] = []
        if reference_hash and reference_hash.strip():
            clean_ref = reference_hash.strip().lower()
            is_mismatch = False
            if len(clean_ref) == 64 and clean_ref != fp_result.hashes.sha256.lower():
                is_mismatch = True
            elif (
                len(clean_ref) == 128
                and fp_result.hashes.sha512
                and clean_ref != fp_result.hashes.sha512.lower()
            ):
                is_mismatch = True
            elif (
                len(clean_ref) == 40
                and fp_result.hashes.sha1
                and clean_ref != fp_result.hashes.sha1.lower()
            ):
                is_mismatch = True

            if is_mismatch:
                integrity_findings.append(
                    Finding(
                        id="FIND-INT-001",
                        category="INTEGRITY",
                        title="Reference Hash Mismatch",
                        description="The analyzed file differs from the supplied reference.",
                        severity=SeverityEnum.MEDIUM,
                        confidence=ConfidenceEnum.HIGH,
                        evidence={
                            "expected_hash": clean_ref,
                            "computed_sha256": fp_result.hashes.sha256,
                        },
                        source_engine="trust_evaluator",
                        recommendation="Confirm that the correct file and version were supplied.",
                    )
                )

        # 7. Consolidate Findings
        all_findings = generic_findings + format_findings + sig_findings + integrity_findings

        # 8. Behavioral Capability Mapping
        capabilities = map_capabilities(file_type_info, generic_features, specific_features)

        # 9. Deterministic Risk & Calibrated Confidence Verdict
        risk_verdict = self.risk_engine.calculate_verdict(
            all_findings, capabilities, file_type_info=file_type_info
        )

        # 10. Real Trust & File Integrity Assessment (Separated from Risk)
        integrity_report, _ = self.trust_evaluator.evaluate(
            scan_id=scan_id,
            hashes=fp_result.hashes,
            file_type_info=file_type_info,
            signature_info=sig_info,
            reference_hash=reference_hash,
            risk_level=risk_verdict.level,
            risk_score=risk_verdict.score,
        )

        # 11. Engine Status Reporting (Mandatory: Never show Clean if an engine did not run)
        engine_statuses: dict[str, EngineStatusEnum] = {
            "static_analysis": EngineStatusEnum.COMPLETED,
            "format_analysis": format_engine_status,
            "signature_analysis": (
                EngineStatusEnum.COMPLETED if sig_info.is_signed else EngineStatusEnum.NOT_APPLICABLE
            ),
            "trust_integrity": EngineStatusEnum.COMPLETED,
            "yara": EngineStatusEnum.NOT_CONFIGURED,
            "clamav": EngineStatusEnum.NOT_CONFIGURED,
            "ml": EngineStatusEnum.NOT_CONFIGURED,
        }

        total_duration = round((time.perf_counter() - total_start) * 1000, 2)
        diagnostics = {
            "fingerprint_time_ms": fp_duration,
            "file_type_time_ms": ft_duration,
            "extraction_time_ms": ext_duration,
            "signature_time_ms": sig_duration,
            "total_scan_time_ms": total_duration,
        }

        logger.info(
            f"Scan completed for {original_filename}: verdict={risk_verdict.level.value} "
            f"score={risk_verdict.score} confidence={risk_verdict.confidence.value} "
            f"integrity={integrity_report.integrity_status.value} trust={integrity_report.trust_score} "
            f"status={scan_status} (total: {total_duration}ms)"
        )

        return ScanResult(
            scan_id=scan_id,
            status=scan_status,
            filename=original_filename,
            file_size_bytes=fp_result.file_size_bytes,
            mime_type=file_type_info.mime,
            magic_bytes=magic_bytes_preview,
            file_type=file_type_info,
            hashes=fp_result.hashes,
            evidence=all_findings,
            findings=all_findings,
            capabilities=capabilities,
            signature_info=sig_info,
            integrity=integrity_report,
            engines=engine_statuses,
            risk_verdict=risk_verdict,
            diagnostics=diagnostics,
        )
