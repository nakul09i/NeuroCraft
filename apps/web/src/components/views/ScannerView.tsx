import React, { useState, useRef } from "react";
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
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing, getScoreState } from "../ui/ScoreRing";
import { Accordion } from "../ui/Accordion";
import { useToast } from "../../context/ToastContext";
import { useNotifications } from "../../context/NotificationContext";
import { api } from "../../api";
import { ScanResponse, VerdictLevel } from "../../types";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const result = await api.uploadAndScan(selectedFile);
      setAnalysisStep(4);
      setScanResult(result);

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
            className={`rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-200 border-2 border-dashed ${
              dragOver
                ? "bg-primary-subtle border-primary shadow-inner"
                : "bg-surface-1/50 border-border hover:border-primary/50 hover:bg-surface-1"
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-surface-0 border border-border flex items-center justify-center mx-auto mb-4 text-primary shadow-xs">
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

          {/* 4-Step Progressive Scanning State */}
          {analyzing && (
            <div className="p-5 rounded-xl bg-surface-1 border border-border space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary uppercase tracking-wider">
                  Analyzing Security Signals
                </span>
                <span className="font-mono text-primary font-bold">Step {analysisStep || 1} of 4</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${(Math.max(1, analysisStep) / 4) * 100}%` }}
                />
              </div>

              {/* Steps Indicator */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {scanSteps.map((s) => {
                  const isCurrent = analysisStep === s.step;
                  const isPast = analysisStep > s.step;
                  return (
                    <div
                      key={s.step}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isCurrent
                          ? "bg-surface-0 border-primary shadow-xs"
                          : isPast
                          ? "bg-surface-0/60 border-emerald-500/30 text-emerald-600"
                          : "bg-surface-0/30 border-border/50 opacity-60"
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        Step {s.step}
                      </div>
                      <div className="text-xs font-semibold text-text-primary mt-0.5 truncate">
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
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                  {scanResult.file.name}
                </h2>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs text-text-muted">
                  <span>Size: <strong className="text-text-primary font-medium">{formatBytes(scanResult.file.size)}</strong></span>
                  <span>·</span>
                  <span>Type: <strong className="text-text-primary font-medium">{scanResult.file.type}</strong></span>
                  <span>·</span>
                  <span>MIME: <code className="text-text-secondary text-[11px] font-mono">{scanResult.file.mime}</code></span>
                </div>
              </div>

              {/* Right Side: Circular Score Ring */}
              <div className="shrink-0">
                <ScoreRing
                  score={safetyScore}
                  size={140}
                  strokeWidth={10}
                  label="Safety Score"
                />
              </div>
            </div>

            {/* Middle: Meaningful Human-Readable Findings (Never Invented Threats) */}
            <div className="py-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Key Findings
              </h3>

              {isHealthy ? (
                <div className="space-y-2">
                  <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-text-primary">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">No meaningful threats detected</span>
                      <p className="text-text-secondary mt-0.5">The binary inspection engines found no signs of malicious code, trojans, or exploit payloads.</p>
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
                  <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-danger/5 border border-danger/25 text-xs text-text-primary">
                    <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-danger">
                        {scanResult.findings[0]?.title || "Suspicious content detected"}
                      </div>
                      <p className="text-text-secondary leading-relaxed">
                        {scanResult.findings[0]?.description || "Anomalous patterns or structure mismatch identified during static inspection."}
                      </p>
                      <div className="pt-1 flex items-center space-x-2 text-[11px] text-text-muted">
                        <span>Severity: {scanResult.findings[0]?.severity || "LOW"}</span>
                        <span>•</span>
                        <span>Confidence: {scanResult.findings[0]?.confidence || "MEDIUM"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions: Analyze Another or View Full Report */}
            <div className="pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
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

              {onGenerateReport && (
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => onGenerateReport(scanResult.scan_id)}
                  className="w-full sm:w-auto text-xs font-semibold"
                  icon={<FileText className="w-4 h-4" />}
                >
                  Generate Signed Report
                </Button>
              )}
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
              </div>

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
