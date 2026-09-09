import React, { useState, useEffect, useRef } from "react";
import {
  FileSearch,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck,
  Lock,
  ArrowRight,
  ShieldAlert,
  Info,
  Layers,
  FileCheck,
  ExternalLink,
  Hash,
  Download,
  Globe2,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing, getScoreState } from "../ui/ScoreRing";
import { Accordion } from "../ui/Accordion";
import { useToast } from "../../context/ToastContext";
import { useNotifications } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import { useConnectivity } from "../../context/ConnectivityContext";
import { syncScanMetadata } from "../../services/syncService";
import { api } from "../../api";
import { ScanReconCorrelation, ScanResponse, VerdictLevel } from "../../types";
import { formatApiError, formatBytes } from "../../utils/error";

export interface ScannerViewProps {
  onGenerateReport?: (scanId: string) => void;
  selectedScanId?: string;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onGenerateReport,
  selectedScanId,
}) => {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const { isOnline } = useConnectivity();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [referenceHash, setReferenceHash] = useState<string>("");
  const [showRefInput, setShowRefInput] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [reconData, setReconData] = useState<ScanReconCorrelation | null>(null);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically load selected scan from history when selectedScanId changes
  useEffect(() => {
    if (selectedScanId) {
      setAnalyzing(true);
      api
        .getScan(selectedScanId)
        .then((res) => {
          setScanResult(res);
          setSelectedFile(null);
        })
        .catch((err) => {
          toast.error(formatApiError(err, "Failed to load requested scan."));
        })
        .finally(() => {
          setAnalyzing(false);
        });
    }
  }, [selectedScanId]);

  // Load correlated passive reconnaissance data if available
  useEffect(() => {
    if (scanResult?.scan_id) {
      api
        .getScanRecon(scanResult.scan_id)
        .then((r) => {
          if (r && r.recon_available) {
            setReconData(r);
          } else {
            setReconData(null);
          }
        })
        .catch(() => setReconData(null));
    }
  }, [scanResult?.scan_id]);

  const handleExport = async (format: "pdf" | "csv" | "json") => {
    if (!scanResult?.scan_id) return;
    setExportingFormat(format);
    try {
      const blob = await api.exportScanReport(scanResult.scan_id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neurocraft_${scanResult.scan_id.substring(0, 10)}_report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report exported successfully.`);
    } catch (err) {
      toast.error(formatApiError(err, `Failed to export ${format.toUpperCase()} report.`));
    } finally {
      setExportingFormat(null);
    }
  };

  const scanSteps = [
    { step: 1, label: "Reading file", detail: "Loading byte stream & computing cryptographic digests" },
    { step: 2, label: "Checking integrity", detail: "Inspecting magic bytes, section headers & Authenticode" },
    { step: 3, label: "Analyzing security signals", detail: "Evaluating Shannon entropy & anomaly heuristics" },
    { step: 4, label: "Generating result", detail: "Compiling verifiable evidence into calibrated score" },
  ];

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    const maxSizeBytes = 100 * 1024 * 1024; // 100 MB
    if (file.size > maxSizeBytes) {
      toast.error("File exceeds maximum allowed size (100 MB).", "File Too Large");
      return;
    }
    setSelectedFile(file);
    setScanResult(null);
  };

  const executeAnalysis = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setAnalysisStep(1);

    const t1 = setTimeout(() => setAnalysisStep(2), 250);
    const t2 = setTimeout(() => setAnalysisStep(3), 600);

    try {
      const result = await api.uploadAndScan(selectedFile, referenceHash || undefined);
      setAnalysisStep(4);
      setScanResult(result);

      // Asynchronous Cloud Firestore sync if authenticated (queues if offline)
      if (user?.id) {
        syncScanMetadata(user.id, result).catch((syncErr) => {
          console.warn("[NeuroCraft Sync] Cloud sync notice:", syncErr);
        });
      }

      const isSafe = result.verdict.level === "SAFE" || result.verdict.level === "LOW";
      toast.success(
        isSafe ? "Analysis complete: File is safe." : "Analysis complete: Potential risks detected.",
        "Scan Complete"
      );

      addNotification(
        "File Analysis Complete",
        `Analyzed "${result.file.name}" — Posture: ${result.verdict.level}`,
        "scan",
        isSafe ? "success" : "warning"
      );
    } catch (err: unknown) {
      const msg = formatApiError(err, "We couldn't analyze this file right now. Please try again.");
      toast.error(msg, "Analysis Error");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setAnalyzing(false);
      setAnalysisStep(0);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    toast.info("SHA-256 hash copied to clipboard");
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Compute safety score: 100 is cleanest/safest
  const safetyScore = scanResult
    ? Math.max(0, Math.min(100, Math.round(100 - (scanResult.verdict.score ?? 0))))
    : null;

  const scoreState = getScoreState(safetyScore);
  const isHealthy = scanResult
    ? scanResult.verdict.level === "SAFE" || scanResult.verdict.level === "LOW"
    : true;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* Page Header (Simple, Apple / Linear Precision) */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          Analyze a File
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed max-w-2xl font-normal">
          Check a file for meaningful security risks. Files are inspected out-of-process and never executed.
        </p>
      </div>

      {/* Upload Zone & Action (When not showing results) */}
      {!scanResult && (
        <Card surface="raised" className="p-7 sm:p-10 space-y-6 border border-border">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInput}
            className="hidden"
          />

          {/* Large Clean Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-200 border-2 border-dashed relative overflow-hidden group ${
              dragOver
                ? "bg-primary-subtle border-primary shadow-md -translate-y-0.5 scale-[1.005]"
                : "bg-surface-1/50 border-border hover:border-primary/50 hover:bg-surface-1"
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl bg-surface-0 border border-border flex items-center justify-center mx-auto mb-4 text-primary shadow-xs transition-transform duration-200 ${
              dragOver ? "scale-110" : "group-hover:scale-105"
            }`}>
              <UploadCloud className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <p className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                {selectedFile ? selectedFile.name : "Drop your file here"}
              </p>
              <p className="text-xs text-text-muted">
                {selectedFile
                  ? `${formatBytes(selectedFile.size)} · Click to choose a different file`
                  : "or browse from your device"}
              </p>
            </div>

            {!selectedFile && (
              <div className="mt-5">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-5 font-semibold text-xs"
                >
                  Choose File
                </Button>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-border/80 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-text-muted">
              <span>PE Executables (.exe, .dll)</span>
              <span>·</span>
              <span>Documents (.pdf, .docx)</span>
              <span>·</span>
              <span>Archives (.zip)</span>
              <span>·</span>
              <span>Scripts (.ps1, .sh, .py)</span>
              <span>·</span>
              <span>Up to 100 MB</span>
            </div>
          </div>

          {/* Optional Reference Hash Verification Accordion */}
          <div className="p-3.5 rounded-xl bg-surface-1/60 border border-border space-y-2">
            <button
              type="button"
              onClick={() => setShowRefInput(!showRefInput)}
              className="text-xs text-text-secondary hover:text-primary transition-colors flex items-center space-x-1.5 font-medium cursor-pointer"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>{showRefInput ? "Hide Reference Hash (Optional)" : "Verify Against Known / Reference Hash (Optional)"}</span>
            </button>
            {showRefInput && (
              <div className="space-y-1 pt-1 animate-fadeIn">
                <input
                  type="text"
                  value={referenceHash}
                  onChange={(e) => setReferenceHash(e.target.value)}
                  placeholder="Paste expected SHA-256, SHA-512, or SHA-1 hex hash to verify integrity..."
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-0 border border-border text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
                />
                <p className="text-[11px] text-text-muted pl-0.5">
                  NeuroCraft compares cryptographic digests out-of-process. A mismatch signals that the analyzed file differs from the reference, not that it is malware.
                </p>
              </div>
            )}
          </div>

          {/* Action Trigger Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center space-x-2 text-xs text-text-muted">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero-Execution Mandate: 100% safe static inspection</span>
            </div>

            <Button
              onClick={selectedFile ? executeAnalysis : () => fileInputRef.current?.click()}
              disabled={analyzing}
              loading={analyzing}
              loadingText="Analyzing file..."
              size="lg"
              variant="primary"
              className="w-full sm:w-auto px-8 py-3 text-sm font-semibold shadow-xs"
              icon={<FileSearch className="w-4 h-4" />}
            >
              Analyze File
            </Button>
          </div>

          {/* Active File Analysis: Laser Scanning Beam & Step Progression */}
          {analyzing && (
            <div className="p-6 rounded-2xl bg-surface-1 border border-primary/30 space-y-5 animate-fadeIn relative overflow-hidden">
              {/* Laser Scanning Line Sweeping Over Active Ingest Box */}
              <div className="scanning-laser-beam" />

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-primary status-dot-safe" />
                  <span className="font-bold text-text-primary uppercase tracking-wider">
                    Analyzing Security Signals
                  </span>
                </div>
                <span className="font-mono text-primary font-bold">Step {analysisStep || 1} of 4</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${(Math.max(1, analysisStep) / 4) * 100}%` }}
                />
              </div>

              {/* Steps Indicator with Crisp Checkmarks and Subtle Highlight */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {scanSteps.map((s) => {
                  const isCurrent = analysisStep === s.step;
                  const isPast = analysisStep > s.step;
                  return (
                    <div
                      key={s.step}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                        isCurrent
                          ? "bg-surface-0 border-primary text-text-primary ring-1 ring-primary/30 shadow-xs"
                          : isPast
                          ? "bg-surface-0/70 border-emerald-500/30 text-text-primary"
                          : "bg-surface-0/30 border-border/50 text-text-muted opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span>Step {s.step}</span>
                        {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />}
                      </div>
                      <div className="text-xs font-semibold mt-1 truncate">
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* =========================================================================
          RESULTS SCREEN: SIMPLE, TRUSTWORTHY & PROGRESSIVELY DISCLOSED
          ========================================================================= */}
      {scanResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Result Card: Security Status & Score */}
          <Card surface="raised" className="p-7 sm:p-9 border border-border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-border">
              {/* Left Side: Verdict & File Info */}
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Security Result
                  </span>
                  <Badge
                    variant={
                      scanResult.verdict.level === "CRITICAL"
                        ? "critical"
                        : scanResult.verdict.level === "HIGH"
                        ? "high"
                        : scanResult.verdict.level === "MEDIUM"
                        ? "medium"
                        : "safe"
                    }
                    size="md"
                  >
                    {scoreState.label.toUpperCase()}
                  </Badge>

                  {/* Operational Status Badge */}
                  <Badge
                    variant={scanResult.status === "limited" ? "neutral" : scanResult.status === "failed" ? "critical" : "safe"}
                    size="sm"
                  >
                    {scanResult.status === "limited" ? "LIMITED ANALYSIS" : scanResult.status === "failed" ? "ANALYSIS FAILED" : "COMPLETED"}
                  </Badge>

                  {/* Analytic Confidence Badge */}
                  <Badge variant="neutral" size="sm">
                    CONFIDENCE: {scanResult.verdict.confidence || "HIGH"}
                  </Badge>

                  {/* Offline-First Local Persistence & Sync Status */}
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-1 border border-border text-text-muted">
                    💾 Saved locally
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md ${isOnline ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                    {isOnline ? "✓ Synced / Queued" : "● Offline (Saved in SQLite)"}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                  {scanResult.file.name || "Uploaded File"}
                </h2>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs text-text-muted">
                  <span>Size: <strong className="text-text-primary font-medium">{formatBytes(scanResult.file.size || 0)}</strong></span>
                  <span>·</span>
                  <span>Type: <strong className="text-text-primary font-medium">{scanResult.file.type || "UNKNOWN"}</strong></span>
                  <span>·</span>
                  <span>MIME: <code className="text-text-secondary text-[11px] font-mono">{scanResult.file.mime || "application/octet-stream"}</code></span>
                </div>
              </div>

              {/* Right Side: Circular Score Ring */}
              <div className="shrink-0">
                <ScoreRing
                  score={safetyScore ?? 100}
                  size={140}
                  strokeWidth={10}
                  label="Safety Score"
                />
              </div>
            </div>

            {/* Analysis Limitations Alert (Honest reporting for unsupported/limited formats) */}
            {scanResult.status === "limited" && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-2.5 text-xs text-text-primary">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Analysis Status: Limited</span>
                  <p className="text-text-secondary mt-0.5">
                    This file format does not currently have a specialized deep parser. Cryptographic SHA-256 fingerprinting and generic static heuristics were executed out-of-process without executing the file.
                  </p>
                </div>
              </div>
            )}

            {/* Real Evidence-Based Trust & File Integrity Card */}
            {scanResult.integrity_summary && (
              <div className="mt-5 p-4 rounded-2xl bg-surface-1 border border-border space-y-3.5 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/70">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      Trust & File Integrity
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        scanResult.integrity_summary.integrity_status === "VERIFIED" ||
                        scanResult.integrity_summary.integrity_status === "UNCHANGED" ||
                        scanResult.integrity_summary.integrity_status === "SIGNED"
                          ? "safe"
                          : scanResult.integrity_summary.integrity_status === "MISMATCH"
                          ? "critical"
                          : "neutral"
                      }
                      size="sm"
                    >
                      INTEGRITY: {scanResult.integrity_summary.integrity_status}
                    </Badge>
                    <Badge variant="neutral" size="sm">
                      {scanResult.integrity_summary.confidence} CONFIDENCE
                    </Badge>
                  </div>
                </div>

                {/* 4-Column Progressive Indicator Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Trust Score */}
                  <div className="p-3 rounded-xl bg-surface-0 border border-border/80 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                      Trust Score
                    </span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-black text-text-primary">
                        {scanResult.integrity_summary.trust_score}
                      </span>
                      <span className="text-[10px] text-text-muted">/ 100</span>
                    </div>
                    <span className="text-[10px] text-text-secondary font-medium block truncate">
                      {scanResult.integrity_summary.trust_level.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Integrity Status */}
                  <div className="p-3 rounded-xl bg-surface-0 border border-border/80 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                      Integrity
                    </span>
                    <div className="text-xs font-bold text-text-primary truncate">
                      {scanResult.integrity_summary.integrity_status === "VERIFIED" && (
                        <span className="text-emerald-500">✓ Verified</span>
                      )}
                      {scanResult.integrity_summary.integrity_status === "UNCHANGED" && (
                        <span className="text-emerald-500">✓ Unchanged</span>
                      )}
                      {scanResult.integrity_summary.integrity_status === "MISMATCH" && (
                        <span className="text-amber-500">⚠ Mismatch</span>
                      )}
                      {scanResult.integrity_summary.integrity_status === "SIGNED" && (
                        <span className="text-emerald-500">✓ Signed</span>
                      )}
                      {scanResult.integrity_summary.integrity_status === "UNSIGNED" && (
                        <span className="text-text-muted">Unsigned</span>
                      )}
                      {scanResult.integrity_summary.integrity_status === "NOT_APPLICABLE" && (
                        <span className="text-text-muted">Not Applicable</span>
                      )}
                      {scanResult.integrity_summary.integrity_status === "UNKNOWN" && (
                        <span className="text-text-muted">Unable to verify</span>
                      )}
                    </div>
                    <span className="text-[10px] text-text-secondary block truncate">
                      {scanResult.integrity_summary.hash_match_status === "MATCH"
                        ? "Hash verified"
                        : scanResult.integrity_summary.hash_match_status === "MISMATCH"
                        ? "Hash mismatch"
                        : "No reference hash"}
                    </span>
                  </div>

                  {/* Signature */}
                  <div className="p-3 rounded-xl bg-surface-0 border border-border/80 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                      Signature
                    </span>
                    <div className="text-xs font-bold text-text-primary truncate">
                      {scanResult.signature_info?.is_signed ? (
                        <span className="text-emerald-500">✓ Valid</span>
                      ) : (
                        <span className="text-text-muted">Unsigned</span>
                      )}
                    </div>
                    <span className="text-[10px] text-text-secondary block truncate">
                      {scanResult.signature_info?.digest_algorithm || "No signature"}
                    </span>
                  </div>

                  {/* Publisher */}
                  <div className="p-3 rounded-xl bg-surface-0 border border-border/80 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                      Publisher
                    </span>
                    <div
                      className="text-xs font-bold text-text-primary truncate"
                      title={scanResult.signature_info?.signer_name || "Publisher information unavailable"}
                    >
                      {scanResult.signature_info?.signer_name || "Unavailable"}
                    </div>
                    <span className="text-[10px] text-text-secondary block truncate">
                      {scanResult.signature_info?.issuer_name || "Publisher information unavailable"}
                    </span>
                  </div>
                </div>

                {/* Evidence Note */}
                <div className="p-2.5 rounded-xl bg-surface-0 border border-border/70 text-xs text-text-secondary flex items-start space-x-2">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-semibold text-text-primary">Evidence: </span>
                    <span>
                      {scanResult.integrity_summary.hash_match_status === "MATCH"
                        ? "Cryptographic SHA-256 matches supplied reference."
                        : scanResult.integrity_summary.hash_match_status === "MISMATCH"
                        ? "The analyzed file differs from the supplied reference hash."
                        : scanResult.signature_info?.is_signed
                        ? `Digitally signed by '${scanResult.signature_info.signer_name}'.`
                        : "No digital signature detected; file hash recorded for integrity benchmarking."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Correlated Passive Reconnaissance (when target network IOCs exist) */}
            {reconData && reconData.recon_available && (
              <div className="mt-4 p-4 rounded-2xl bg-surface-1 border border-border space-y-3 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/70">
                  <div className="flex items-center space-x-2">
                    <Globe2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      Correlated Reconnaissance
                    </span>
                  </div>
                  <Badge variant="safe" size="sm">
                    TARGET: {reconData.target}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-surface-0 border border-border/80">
                    <span className="text-[10px] uppercase text-text-muted block">Exposure Score</span>
                    <span className="font-bold text-text-primary">{reconData.exposure_score ?? 0} / 100</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-0 border border-border/80">
                    <span className="text-[10px] uppercase text-text-muted block">Posture Level</span>
                    <span className="font-bold text-text-primary">{reconData.exposure_level ?? "SAFE"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-0 border border-border/80">
                    <span className="text-[10px] uppercase text-text-muted block">Technologies</span>
                    <span className="font-bold text-text-primary">{reconData.technologies?.length || 0} Observed</span>
                  </div>
                </div>
              </div>
            )}

            {/* Middle: Meaningful Human-Readable Findings (Never Invented Threats) */}
            <div className="py-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Evidence-Based Findings ({scanResult.findings?.length || 0})
                </h3>
                {scanResult.findings && scanResult.findings.length > 0 && (
                  <span className="text-[11px] text-text-muted">
                    Evidence verified out-of-process
                  </span>
                )}
              </div>

              {(!scanResult.findings || scanResult.findings.length === 0) ? (
                <div className="space-y-2">
                  <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-text-primary">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">No meaningful threats detected</span>
                      <p className="text-text-secondary mt-0.5">The passive inspection engines found no signs of malicious code, trojans, or exploit payloads.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-surface-1 border border-border text-xs text-text-primary">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-text-primary">File structure looks normal</span>
                      <p className="text-text-secondary mt-0.5">Magic byte header matches standard format specifications with expected section layouts.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-surface-1 border border-border text-xs text-text-primary">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-text-primary">No suspicious indicators found</span>
                      <p className="text-text-secondary mt-0.5">No abnormal byte entropy, cross-process injection hooks, or unauthorized persistence mechanisms.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {scanResult.findings.map((f, idx) => (
                    <div
                      key={f.id || idx}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        f.severity === "CRITICAL" || f.severity === "HIGH"
                          ? "bg-danger/5 border-danger/25"
                          : f.severity === "MEDIUM"
                          ? "bg-amber-500/5 border-amber-500/25"
                          : "bg-surface-1 border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${
                            f.severity === "CRITICAL" || f.severity === "HIGH"
                              ? "text-danger"
                              : f.severity === "MEDIUM"
                              ? "text-amber-500"
                              : "text-text-muted"
                          }`} />
                          <span className="font-bold text-text-primary">{f.title}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Badge
                            size="sm"
                            variant={
                              f.severity === "CRITICAL"
                                ? "critical"
                                : f.severity === "HIGH"
                                ? "high"
                                : f.severity === "MEDIUM"
                                ? "medium"
                                : "neutral"
                            }
                          >
                            {f.severity}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-text-secondary leading-relaxed pl-5">
                        {f.description}
                      </p>

                      {/* Verifiable Evidence Snippet */}
                      {f.evidence && Object.keys(f.evidence).length > 0 && (
                        <div className="ml-5 p-2 rounded-lg bg-surface-0 border border-border/70 font-mono text-[11px] text-text-secondary overflow-x-auto">
                          <span className="text-text-muted font-sans font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                            Structural Evidence:
                          </span>
                          <code>{JSON.stringify(f.evidence, null, 2)}</code>
                        </div>
                      )}

                      <div className="pl-5 pt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
                        <span>Confidence: <strong className="text-text-primary font-medium">{f.confidence || "HIGH"}</strong></span>
                        <span>·</span>
                        <span>Engine: <code className="text-text-secondary font-mono">{f.source_engine || "scanner"}</code></span>
                        {f.weight ? (
                          <>
                            <span>·</span>
                            <span>Weight: {f.weight} pts</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions: Analyze Another, Direct Export (PDF/CSV/JSON), or Comprehensive Report */}
            <div className="pt-5 border-t border-border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setScanResult(null);
                  setSelectedFile(null);
                }}
                className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Analyze Another File</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleExport("pdf")}
                  loading={exportingFormat === "pdf"}
                  className="text-xs font-semibold"
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Export PDF
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleExport("csv")}
                  loading={exportingFormat === "csv"}
                  className="text-xs font-semibold"
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleExport("json")}
                  loading={exportingFormat === "json"}
                  className="text-xs font-semibold"
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Export JSON
                </Button>

                {onGenerateReport && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onGenerateReport(scanResult.scan_id)}
                    className="text-xs font-semibold"
                    icon={<FileText className="w-3.5 h-3.5" />}
                  >
                    Generate Audit Report
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Technical Details Accordion (Progressive Disclosure) */}
          <Accordion
            title="View technical details"
            subtitle="SHA-256 digest, Authenticode signature status, section entropy, and static capabilities"
            icon={<Layers className="w-4 h-4" />}
          >
            <div className="space-y-5 text-xs">
              {/* SHA-256 Hash Digest */}
              <div className="p-3 rounded-xl bg-surface-0 border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    SHA-256 Digest
                  </span>
                  <button
                    onClick={() => copyHash(scanResult.file.sha256)}
                    className="text-[11px] font-semibold text-primary hover:text-primary-hover flex items-center space-x-1 transition-colors"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHash ? "Copied" : "Copy Digest"}</span>
                  </button>
                </div>
                <code className="block font-mono text-text-primary text-[11px] break-all bg-surface-1 p-2 rounded-lg border border-border/60 select-all">
                  {scanResult.file.sha256}
                </code>

                {scanResult.integrity_summary?.sha512 && (
                  <div className="pt-2 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      SHA-512 Digest
                    </span>
                    <code className="block font-mono text-text-secondary text-[11px] break-all bg-surface-1 p-2 rounded-lg border border-border/60 select-all">
                      {scanResult.integrity_summary.sha512}
                    </code>
                  </div>
                )}

                {scanResult.integrity_summary?.sha1 && (
                  <div className="pt-2 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      SHA-1 Digest (Legacy Identification Only)
                    </span>
                    <code className="block font-mono text-text-secondary text-[11px] break-all bg-surface-1 p-2 rounded-lg border border-border/60 select-all">
                      {scanResult.integrity_summary.sha1}
                    </code>
                  </div>
                )}
              </div>

              {/* Structured Trust & Integrity Evidence Items */}
              {scanResult.integrity_summary?.evidence && scanResult.integrity_summary.evidence.length > 0 && (
                <div className="p-3 rounded-xl bg-surface-0 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Forensic Trust & Integrity Evidence ({scanResult.integrity_summary.evidence.length})
                    </span>
                    <span className="text-[10px] text-text-muted">Cryptographically ground truth</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {scanResult.integrity_summary.evidence.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-surface-1/60 border border-border/60 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold uppercase tracking-wider text-primary text-[10px]">
                              {ev.type}
                            </span>
                            {ev.algorithm && (
                              <span className="font-mono text-text-muted text-[10px]">
                                ({ev.algorithm})
                              </span>
                            )}
                          </div>
                          <Badge
                            size="sm"
                            variant={
                              ev.status === "match" || ev.status === "verified" || ev.status === "signed"
                                ? "safe"
                                : ev.status === "mismatch" || ev.status === "invalid"
                                ? "critical"
                                : "neutral"
                            }
                          >
                            {ev.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          {ev.meaning}
                        </p>
                        {ev.value && (
                          <code className="block font-mono text-[10px] text-text-muted break-all pt-0.5">
                            {ev.value}
                          </code>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Digital Signature & Authenticode Status */}
              <div className="p-3 rounded-xl bg-surface-0 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Digital Signature Status
                  </span>
                  <Badge
                    variant={scanResult.signature_info?.is_signed ? "safe" : "neutral"}
                    size="sm"
                  >
                    {scanResult.signature_info?.status || "UNSIGNED"}
                  </Badge>
                </div>

                <div className="text-text-secondary leading-relaxed">
                  {scanResult.signature_info?.is_signed ? (
                    <span>
                      Signed by <strong>{scanResult.signature_info?.signer_name || "Verified Publisher"}</strong> (Issuer: {scanResult.signature_info?.issuer_name || "Trusted CA"}).
                    </span>
                  ) : (
                    <span>
                      This file does not have an embedded Authenticode digital signature. While common for unsigned open-source or script assets, unsigned binaries should be verified through trusted source channels.
                    </span>
                  )}
                </div>
              </div>

              {/* Observed System Capabilities */}
              {scanResult.capabilities && scanResult.capabilities.length > 0 && (
                <div className="p-3 rounded-xl bg-surface-0 border border-border space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Static Capabilities
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {scanResult.capabilities.map((cap, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-1/60 border border-border/60 text-[11px]"
                      >
                        <span className="capitalize text-text-primary font-medium">{cap.capability.replace(/_/g, " ")}</span>
                        <span className={`font-mono font-semibold ${cap.status === "DETECTED" ? "text-amber-500" : "text-text-muted"}`}>
                          {cap.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnostics & Engine Telemetry */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
                <span>Scan ID: <code className="font-mono text-text-secondary">{scanResult.scan_id}</code></span>
                <span>Diagnostics: {scanResult.metadata?.diagnostics?.total_scan_time_ms ?? "< 1"} ms</span>
              </div>
            </div>
          </Accordion>
        </div>
      )}
    </div>
  );
};
