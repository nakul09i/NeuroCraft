"""Evidence-based Trust & File Integrity Evaluator for NeuroCraft.

Answers:
1. Has the file changed?
2. Does its cryptographic hash match a known/reference hash?
3. Is a digital signature present?
4. Can that signature be verified?
5. Is the signer information available?
6. Is the file integrity known?
7. What evidence supports the result?

Core Principles:
- "Unknown" is NOT the same as "Malicious".
- An unsigned file is NOT automatically malicious.
- An unknown publisher is NOT automatically malicious.
- A changed hash is NOT automatically malware.
- Every conclusion must be backed by verifiable structural evidence.
"""

import re
from datetime import UTC, datetime
from typing import Any

from neurocraft_types import (
    ConfidenceEnum,
    DigitalSignatureInfo,
    FileIntegrityReport,
    FileTypeEnum,
    FileTypeInfo,
    HashDigest,
    HashMatchStatusEnum,
    IntegrityStatusEnum,
    SignatureStatusEnum,
    TrustAssessment,
    TrustEvidenceItem,
    TrustLevelEnum,
    VerdictLevel,
)

HEX_REGEX = re.compile(r"^[0-9a-fA-F]+$")


class TrustIntegrityEvaluator:
    """Deterministic evaluator for cryptographic file integrity and authenticity trust."""

    def evaluate(
        self,
        scan_id: str,
        hashes: HashDigest,
        file_type_info: FileTypeInfo,
        signature_info: DigitalSignatureInfo | None,
        reference_hash: str | None = None,
        risk_level: VerdictLevel = VerdictLevel.SAFE,
        risk_score: float = 0.0,
    ) -> tuple[FileIntegrityReport, TrustAssessment]:
        """
        Evaluate cryptographic integrity, compare against optional reference hash,
        and calculate an evidence-based Trust Score separate from Risk.
        """
        evidence: list[TrustEvidenceItem] = []

        # 1. Primary SHA-256 Fingerprint Evidence
        evidence.append(
            TrustEvidenceItem(
                type="hash",
                algorithm="SHA-256",
                value=hashes.sha256,
                status="computed",
                meaning="Cryptographic SHA-256 primary digest computed via out-of-process streaming.",
                details={"length_bits": 256},
            )
        )

        if hashes.sha512:
            evidence.append(
                TrustEvidenceItem(
                    type="hash",
                    algorithm="SHA-512",
                    value=hashes.sha512,
                    status="computed",
                    meaning="Cryptographic SHA-512 high-security digest computed via streaming.",
                    details={"length_bits": 512},
                )
            )

        # 2. Reference Hash Verification
        hash_match_status, ref_algo, ref_meaning = self._verify_reference_hash(hashes, reference_hash)
        evidence.append(
            TrustEvidenceItem(
                type="reference_hash",
                algorithm=ref_algo,
                value=reference_hash.strip().lower() if reference_hash else None,
                status=hash_match_status.value.lower(),
                meaning=ref_meaning,
                details={
                    "match_status": hash_match_status.value,
                    "target_algorithm": ref_algo,
                },
            )
        )

        # 3. Digital Signature Inspection
        sig_status = self._normalize_signature_status(file_type_info, signature_info)
        sig_meaning, sig_details = self._explain_signature(sig_status, signature_info)

        evidence.append(
            TrustEvidenceItem(
                type="signature",
                algorithm=signature_info.digest_algorithm if signature_info else None,
                value=signature_info.signer_name if signature_info else None,
                status=sig_status.value.lower(),
                meaning=sig_meaning,
                details=sig_details,
            )
        )

        # 4. Certificate Evidence (if present)
        if signature_info and signature_info.certificates:
            leaf_cert = signature_info.certificates[0]
            evidence.append(
                TrustEvidenceItem(
                    type="certificate",
                    algorithm=leaf_cert.signature_algorithm,
                    value=leaf_cert.serial_number,
                    status="extracted",
                    meaning=f"Certificate issued to: {leaf_cert.subject}",
                    details={
                        "subject": leaf_cert.subject,
                        "issuer": leaf_cert.issuer,
                        "serial_number": leaf_cert.serial_number,
                        "valid_from": leaf_cert.not_before,
                        "valid_until": leaf_cert.not_after,
                        "is_self_signed": leaf_cert.is_self_signed,
                        "is_expired": leaf_cert.is_expired,
                    },
                )
            )

        # 5. Deterministic Integrity Status Determination
        integrity_status = self._determine_integrity_status(
            hash_match_status=hash_match_status,
            signature_status=sig_status,
            file_type_info=file_type_info,
        )

        evidence.append(
            TrustEvidenceItem(
                type="integrity",
                algorithm=None,
                value=integrity_status.value,
                status=integrity_status.value.lower(),
                meaning=self._explain_integrity_status(integrity_status, hash_match_status, sig_status),
                details={"integrity_status": integrity_status.value},
            )
        )

        # 6. Evidence-Based Trust Score (0.0 to 100.0)
        trust_score, trust_level, confidence, confidence_score, summary = self._calculate_trust_score(
            hash_match_status=hash_match_status,
            signature_status=sig_status,
            signature_info=signature_info,
            file_type_info=file_type_info,
            integrity_status=integrity_status,
            risk_level=risk_level,
        )

        now = datetime.now(UTC)

        report = FileIntegrityReport(
            scan_id=scan_id,
            sha256=hashes.sha256,
            sha512=hashes.sha512,
            sha1=hashes.sha1,
            reference_hash=reference_hash.strip() if reference_hash else None,
            hash_match_status=hash_match_status,
            signature_info=signature_info,
            integrity_status=integrity_status,
            trust_score=trust_score,
            trust_level=trust_level,
            confidence=confidence,
            confidence_score=confidence_score,
            evidence=evidence,
            created_at=now,
        )

        assessment = TrustAssessment(
            scan_id=scan_id,
            trust_score=trust_score,
            trust_level=trust_level,
            confidence=confidence,
            confidence_score=confidence_score,
            integrity_status=integrity_status,
            risk_level=risk_level,
            risk_score=risk_score,
            evidence=evidence,
            summary=summary,
            created_at=now,
        )

        return report, assessment

    def _verify_reference_hash(
        self, hashes: HashDigest, reference_hash: str | None
    ) -> tuple[HashMatchStatusEnum, str | None, str]:
        """Verify user-provided reference hash against computed file digests."""
        if not reference_hash or not reference_hash.strip():
            return (
                HashMatchStatusEnum.NOT_PROVIDED,
                None,
                "No reference hash supplied for integrity comparison.",
            )

        clean_ref = reference_hash.strip().lower()

        if not HEX_REGEX.match(clean_ref):
            return (
                HashMatchStatusEnum.INVALID_REFERENCE,
                None,
                "The supplied reference hash contains non-hexadecimal characters.",
            )

        ref_len = len(clean_ref)
        if ref_len == 64:
            algo = "SHA-256"
            computed = hashes.sha256.lower()
        elif ref_len == 128:
            algo = "SHA-512"
            computed = (hashes.sha512 or "").lower()
        elif ref_len == 40:
            algo = "SHA-1"
            computed = (hashes.sha1 or "").lower()
        elif ref_len == 32:
            algo = "MD5"
            computed = (hashes.md5 or "").lower()
        else:
            return (
                HashMatchStatusEnum.INVALID_REFERENCE,
                None,
                f"Reference hash length ({ref_len} hex chars) does not match supported digests (SHA-256: 64, SHA-512: 128, SHA-1: 40).",
            )

        if not computed:
            return (
                HashMatchStatusEnum.NOT_PROVIDED,
                algo,
                f"Reference hash algorithm {algo} could not be computed for comparison.",
            )

        if clean_ref == computed:
            return (
                HashMatchStatusEnum.MATCH,
                algo,
                f"Cryptographic hash matches the supplied {algo} reference.",
            )
        else:
            return (
                HashMatchStatusEnum.MISMATCH,
                algo,
                "The analyzed file differs from the supplied reference.",
            )

    def _normalize_signature_status(
        self,
        file_type_info: FileTypeInfo,
        signature_info: DigitalSignatureInfo | None,
    ) -> SignatureStatusEnum:
        """Map raw signature info into standardized SignatureStatusEnum."""
        if not signature_info:
            if file_type_info.type in (FileTypeEnum.PE, FileTypeEnum.APK, FileTypeEnum.PDF):
                return SignatureStatusEnum.UNSIGNED
            return SignatureStatusEnum.NOT_APPLICABLE

        if not signature_info.is_signed:
            if file_type_info.type in (FileTypeEnum.PE, FileTypeEnum.APK, FileTypeEnum.PDF):
                return SignatureStatusEnum.UNSIGNED
            return SignatureStatusEnum.NOT_APPLICABLE

        return signature_info.status

    def _explain_signature(
        self,
        status: SignatureStatusEnum,
        signature_info: DigitalSignatureInfo | None,
    ) -> tuple[str, dict[str, Any]]:
        """Produce human-readable explanation and metadata for signature state."""
        details: dict[str, Any] = {"status": status.value}

        if status == SignatureStatusEnum.NOT_APPLICABLE:
            return (
                "File format does not support standard embedded digital signatures.",
                details,
            )

        if status == SignatureStatusEnum.UNSIGNED:
            return (
                "No digital signature was detected. Unsigned files are common but lack cryptographic publisher proof.",
                details,
            )

        if status in (SignatureStatusEnum.VALID, SignatureStatusEnum.SIGNED):
            signer = signature_info.signer_name if signature_info and signature_info.signer_name else "Publisher"
            issuer = signature_info.issuer_name if signature_info and signature_info.issuer_name else "Issuing CA"
            details["signer"] = signer
            details["issuer"] = issuer
            return (
                f"Valid digital signature present. Signed by '{signer}' (Issuer: '{issuer}').",
                details,
            )

        if status == SignatureStatusEnum.SELF_SIGNED:
            signer = signature_info.signer_name if signature_info and signature_info.signer_name else "Unknown"
            details["signer"] = signer
            return (
                f"Digital signature is self-signed by '{signer}'. Identity is self-attested and not backed by a trusted root CA.",
                details,
            )

        if status in (SignatureStatusEnum.CORRUPTED, SignatureStatusEnum.INVALID, SignatureStatusEnum.INVALID_TAMPERED):
            return (
                "Digital signature directory is malformed or signature digest does not match file content (potential tampering).",
                details,
            )

        return (
            "Digital signature presence observed, but verification could not be completed out-of-process.",
            details,
        )

    def _determine_integrity_status(
        self,
        hash_match_status: HashMatchStatusEnum,
        signature_status: SignatureStatusEnum,
        file_type_info: FileTypeInfo,
    ) -> IntegrityStatusEnum:
        """
        Produce a deterministic integrity status using only states that make sense for the file:
        VERIFIED, UNCHANGED, MISMATCH, SIGNED, UNSIGNED, UNKNOWN, NOT_APPLICABLE.
        """
        # 1. Reference Hash Mismatch takes definitive precedence: the file is altered from reference
        if hash_match_status == HashMatchStatusEnum.MISMATCH:
            return IntegrityStatusEnum.MISMATCH

        # 2. Reference Hash Match
        if hash_match_status == HashMatchStatusEnum.MATCH:
            if signature_status in (SignatureStatusEnum.VALID, SignatureStatusEnum.SIGNED):
                return IntegrityStatusEnum.VERIFIED
            return IntegrityStatusEnum.UNCHANGED

        # 3. No Reference Hash or Invalid Reference Hash: rely on signature & format capability
        if signature_status in (SignatureStatusEnum.VALID, SignatureStatusEnum.SIGNED):
            return IntegrityStatusEnum.SIGNED

        if signature_status in (SignatureStatusEnum.CORRUPTED, SignatureStatusEnum.INVALID, SignatureStatusEnum.INVALID_TAMPERED):
            return IntegrityStatusEnum.MISMATCH

        if signature_status == SignatureStatusEnum.UNSIGNED:
            if file_type_info.type in (FileTypeEnum.PE, FileTypeEnum.APK, FileTypeEnum.PDF):
                return IntegrityStatusEnum.UNSIGNED
            return IntegrityStatusEnum.NOT_APPLICABLE

        if signature_status == SignatureStatusEnum.NOT_APPLICABLE:
            return IntegrityStatusEnum.NOT_APPLICABLE

        return IntegrityStatusEnum.UNKNOWN

    def _explain_integrity_status(
        self,
        integrity_status: IntegrityStatusEnum,
        hash_match_status: HashMatchStatusEnum,
        signature_status: SignatureStatusEnum,
    ) -> str:
        """Provide human-readable explanation of deterministic integrity state."""
        if integrity_status == IntegrityStatusEnum.VERIFIED:
            return "File hash matches the reference hash and digital signature is validly signed."
        elif integrity_status == IntegrityStatusEnum.UNCHANGED:
            return "File hash matches the reference hash; content is unchanged from reference."
        elif integrity_status == IntegrityStatusEnum.MISMATCH:
            if hash_match_status == HashMatchStatusEnum.MISMATCH:
                return "The analyzed file differs from the supplied reference hash."
            return "Digital signature structure indicates modification or tampering."
        elif integrity_status == IntegrityStatusEnum.SIGNED:
            return "File possesses a well-formed digital signature from an identified signer."
        elif integrity_status == IntegrityStatusEnum.UNSIGNED:
            return "File format supports Authenticode/PKCS#7 signatures, but no digital signature was found."
        elif integrity_status == IntegrityStatusEnum.NOT_APPLICABLE:
            return "File format does not utilize cryptographic digital signatures."
        return "Integrity status could not be established from available evidence."

    def _calculate_trust_score(
        self,
        hash_match_status: HashMatchStatusEnum,
        signature_status: SignatureStatusEnum,
        signature_info: DigitalSignatureInfo | None,
        file_type_info: FileTypeInfo,
        integrity_status: IntegrityStatusEnum,
        risk_level: VerdictLevel,
    ) -> tuple[float, TrustLevelEnum, ConfidenceEnum, float, str]:
        """
        Calculate an evidence-based Trust Score (0.0 to 100.0) strictly separated from Risk.

        Zero Randomness. Grounded strictly in:
        - Reference hash verification
        - Signature presence & validity
        - Certificate authority hierarchy (Root CA vs Self-Signed)
        - Format standard conformance
        """
        # Base neutral trust score for any unverified benign asset: 50.0
        score = 50.0

        # Adjust for Reference Hash Evidence
        if hash_match_status == HashMatchStatusEnum.MATCH:
            score += 25.0
        elif hash_match_status == HashMatchStatusEnum.MISMATCH:
            score -= 35.0  # File is modified / unexpected
        elif hash_match_status == HashMatchStatusEnum.INVALID_REFERENCE:
            score -= 5.0

        # Adjust for Digital Signature Evidence
        if signature_status in (SignatureStatusEnum.VALID, SignatureStatusEnum.SIGNED):
            # Check certificate issuer
            if signature_info and signature_info.certificates:
                leaf = signature_info.certificates[0]
                if leaf.is_self_signed:
                    score += 10.0  # Identity claimed, but not third-party certified
                elif leaf.is_expired:
                    score += 15.0  # Third-party certified, but expired validity
                else:
                    score += 25.0  # Third-party commercial or standard PKI
            else:
                score += 20.0
        elif signature_status == SignatureStatusEnum.SELF_SIGNED:
            score += 10.0
        elif signature_status in (
            SignatureStatusEnum.CORRUPTED,
            SignatureStatusEnum.INVALID,
            SignatureStatusEnum.INVALID_TAMPERED,
        ):
            score -= 35.0
        elif signature_status == SignatureStatusEnum.UNSIGNED:
            # Unsigned files are NOT penalized into maliciousness; they remain neutral (50)
            score += 0.0
        elif signature_status == SignatureStatusEnum.NOT_APPLICABLE:
            score += 0.0

        # Bound score between 0.0 and 100.0
        trust_score = round(max(0.0, min(100.0, score)), 1)

        # Categorical Trust Level
        if trust_score >= 85.0:
            trust_level = TrustLevelEnum.VERY_HIGH
        elif trust_score >= 70.0:
            trust_level = TrustLevelEnum.HIGH
        elif trust_score >= 40.0:
            trust_level = TrustLevelEnum.NEUTRAL
        elif trust_score >= 20.0:
            trust_level = TrustLevelEnum.LOW
        else:
            trust_level = TrustLevelEnum.VERY_LOW

        # Calibrated Confidence in Trust Evaluation
        # Confidence increases with available independent verification channels
        confidence_points = 0.50  # Base confidence from SHA-256 fingerprinting
        if hash_match_status in (HashMatchStatusEnum.MATCH, HashMatchStatusEnum.MISMATCH):
            confidence_points += 0.25
        if signature_status in (
            SignatureStatusEnum.VALID,
            SignatureStatusEnum.SIGNED,
            SignatureStatusEnum.SELF_SIGNED,
            SignatureStatusEnum.CORRUPTED,
            SignatureStatusEnum.INVALID,
        ):
            confidence_points += 0.25
        elif file_type_info.is_supported:
            confidence_points += 0.15

        calibrated_confidence = round(min(1.0, confidence_points), 2)
        if calibrated_confidence >= 0.80:
            confidence_enum = ConfidenceEnum.HIGH
        elif calibrated_confidence >= 0.60:
            confidence_enum = ConfidenceEnum.MEDIUM
        else:
            confidence_enum = ConfidenceEnum.LOW

        # Explanatory Summary
        summary = self._compose_summary(
            trust_level=trust_level,
            trust_score=trust_score,
            integrity_status=integrity_status,
            hash_match_status=hash_match_status,
            signature_status=signature_status,
            signature_info=signature_info,
            risk_level=risk_level,
        )

        return trust_score, trust_level, confidence_enum, calibrated_confidence, summary

    def _compose_summary(
        self,
        trust_level: TrustLevelEnum,
        trust_score: float,
        integrity_status: IntegrityStatusEnum,
        hash_match_status: HashMatchStatusEnum,
        signature_status: SignatureStatusEnum,
        signature_info: DigitalSignatureInfo | None,
        risk_level: VerdictLevel,
    ) -> str:
        """Compose clear explanation separating Trust from Risk."""
        parts: list[str] = []

        if integrity_status == IntegrityStatusEnum.VERIFIED:
            parts.append("File integrity is verified with matching reference hash and valid digital signature.")
        elif integrity_status == IntegrityStatusEnum.UNCHANGED:
            parts.append("File integrity is confirmed unchanged against reference hash.")
        elif integrity_status == IntegrityStatusEnum.MISMATCH:
            if hash_match_status == HashMatchStatusEnum.MISMATCH:
                parts.append("File hash differs from the supplied reference (integrity mismatch).")
            else:
                parts.append("Digital signature integrity check failed (potential tampering).")
        elif integrity_status == IntegrityStatusEnum.SIGNED:
            signer = signature_info.signer_name if signature_info and signature_info.signer_name else "Publisher"
            parts.append(f"Signed by {signer}.")
        elif integrity_status == IntegrityStatusEnum.UNSIGNED:
            parts.append("File is unsigned.")
        elif integrity_status == IntegrityStatusEnum.NOT_APPLICABLE:
            parts.append("File format does not support digital signatures.")
        else:
            parts.append("Integrity status is unverified.")

        # Reiterate separation of trust and risk
        if risk_level in (VerdictLevel.SAFE, VerdictLevel.LOW) and trust_level == TrustLevelEnum.NEUTRAL:
            parts.append("Risk is low/safe; trust is neutral because publisher identity is unverified.")
        elif risk_level in (VerdictLevel.SAFE, VerdictLevel.LOW) and trust_level in (
            TrustLevelEnum.HIGH,
            TrustLevelEnum.VERY_HIGH,
        ):
            parts.append("High trust and safe risk posture confirmed by evidence.")

        return " ".join(parts)
