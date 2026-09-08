import React, { useState, useRef } from "react";
import {
  Upload,
  ShieldCheck,
  ShieldAlert,
  FileCode,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  FileText,
  Key,
  Layers,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Award,
  AlertTriangle,
  Lock,
  Unlock,
  Activity,
  Binary,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing } from "../ui/ScoreRing";
import { useToast } from "../../context/ToastContext";
import { useNotifications } from "../../context/NotificationContext";
import { api } from "../../api";
import { ScanResponse, VerdictLevel } from "../../types";
import { formatApiError, formatBytes, safeNumber } from "../../utils/error";

export interface ScannerViewProps {
  onScanComplete?: (scan: ScanResponse) => void;
  onGenerateReport?: (scanId: string) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onScanComplete,
  onGenerateReport,
}) => {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [failedStep, setFailedStep] = useState<number | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Expandable finding rows tracking
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});

  // Progressive disclosure expandable section toggles
  const [showTechEvidence, setShowTechEvidence] = useState(true);
  const [showCryptoDetails, setShowCryptoDetails] = useState(true);
  const [showRawMetadata, setShowRawMetadata] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 8-stage progress timeline required by specification
  const stages = [
    { id: 1, label: "Secure Quarantine", desc: "Isolating file in secure in-memory buffer" },
    { id: 2, label: "Hash Calculation", desc: "Computing cryptographic SHA-256 and MD5 digests" },
    { id: 3, label: "Metadata Extraction", desc: "Parsing file size, timestamps, and MIME properties" },
    { id: 4, label: "Format/Header Parsing", desc: "Analyzing PE/ELF/Mach-O/PDF structures and headers" },
    { id: 5, label: "Entropy Analysis", desc: "Measuring byte-distribution entropy and packing indicators" },
    { id: 6, label: "Digital Signature Verification", desc: "Validating Authenticode, X.509 certs, and trust chains" },
    { id: 7, label: "Risk Scoring", desc: "Synthesizing multi-engine findings and weighted heuristics" },
    { id: 8, label: "Final Report Assembly", desc: "Compiling verifiable provenance and security verdict" },
  ];

  const pipelineNodes = [
    { id: 1, label: "FILE", sub: "Quarantine", icon: FileCode, stage: 1 },
    { id: 2, label: "HASH", sub: "SHA-256", icon: Key, stage: 2 },
    { id: 3, label: "METADATA", sub: "PE/Headers", icon: Layers, stage: 4 },
    { id: 4, label: "ENTROPY", sub: "Shannon", icon: Activity, stage: 5 },
    { id: 5, label: "SIGNATURE", sub: "Authenticode", icon: Lock, stage: 6 },
    { id: 6, label: "RISK", sub: "Heuristics", icon: ShieldCheck, stage: 8 },
  ];

  const toggleFindingExpanded = (id: string) => {
    setExpandedFindings((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const loadSampleFile = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const file = new File([blob], name, { type });
    setSelectedFile(file);
    toast.info(`Sample artifact "${name}" loaded.`);
  };

  const executeAnalysis = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setAnalysisStep(1);
    setFailedStep(null);
    setScanResult(null);

    // Progressive timeline cadence across 8 stages
    const timer1 = setTimeout(() => setAnalysisStep(2), 250);
    const timer2 = setTimeout(() => setAnalysisStep(3), 550);
    const timer3 = setTimeout(() => setAnalysisStep(4), 850);
    const timer4 = setTimeout(() => setAnalysisStep(5), 1150);
    const timer5 = setTimeout(() => setAnalysisStep(6), 1450);
    const timer6 = setTimeout(() => setAnalysisStep(7), 1750);

    try {
      const res = await api.uploadAndScan(selectedFile);
      setAnalysisStep(8);
      setTimeout(() => {
        setScanResult(res);
        setAnalyzing(false);
        // Expand all findings by default
        const initialExpand: Record<string, boolean> = {};
        res.findings.forEach((f) => {
          initialExpand[f.id] = true;
        });
        setExpandedFindings(initialExpand);

        toast.success(`Analysis completed for ${selectedFile.name}`);
        addNotification(
          "File Quarantine Analysis Completed",
          `Artifact "${selectedFile.name}" evaluated: Risk ${res.verdict.level} (${res.verdict.score}/100)`,
          "scanner",
          res.verdict.level === "SAFE" ? "success" : "warning"
        );
        if (onScanComplete) onScanComplete(res);
      }, 400);
    } catch (err: unknown) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(timer6);
      setFailedStep(analysisStep || 1);
      setAnalyzing(false);
      const msg = formatApiError(err, "File analysis failed. Please verify file integrity and try again.");
      toast.error(msg, "Analysis Error");
      addNotification("File Analysis Failed", msg, "scanner", "error");
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    toast.info("SHA-256 hash copied to clipboard");
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const getVerdictBadgeVariant = (level: VerdictLevel | "INFO"): "safe" | "low" | "medium" | "high" | "critical" | "neutral" => {
    if (level === "INFO") return "neutral";
    if (level === "SAFE") return "safe";
    if (level === "LOW") return "low";
    if (level === "MEDIUM") return "medium";
    return "high";
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-14">
      {/* Header Banner */}
      <Card surface="raised" className="p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex items-center space-x-2.5 mb-3">
          <Badge variant="safe" size="sm">Deterministic Quarantine</Badge>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            Zero Dynamic Code Execution
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
          Safe Static File Analysis
        </h1>
        <p className="text-base text-text-secondary mt-2 max-w-3xl leading-relaxed">
          Inspect executable binaries, documents, scripts, and archives in memory quarantine. Extracts cryptographic digests, entropy variance, and Authenticode / X.509 signature provenance without executing untrusted code.
        </p>
      </Card>

      {/* Upload Zone & Form Card */}
      {!scanResult && (
        <Card surface="raised" className="p-7 sm:p-10 space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInput}
            className="hidden"
          />

          {/* Large Inset Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-200 border-2 border-dashed ${
              dragOver
                ? "neu-inset bg-primary/10 border-primary shadow-inner"
                : "neu-inset bg-surface-0/50 border-border/70 hover:border-primary/50"
            }`}
          >
            <div className="w-16 h-16 rounded-3xl neu-raised-sm text-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
              <Upload className="w-8 h-8 stroke-[2]" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              {selectedFile ? selectedFile.name : "Drop file here"}
            </h3>

            <p className="text-sm text-text-secondary mt-1.5 max-w-md mx-auto">
              {selectedFile
                ? `${formatBytes(selectedFile.size)} · Ready to analyze`
                : "or click Browse Files from your computer"}
            </p>

            <div className="mt-5 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="shadow-md font-semibold text-sm px-6"
              >
                Browse Files
              </Button>
              {selectedFile && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="neu-button text-sm"
                >
                  Clear
                </Button>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-text-muted">
              <span>Maximum Size: <strong>25 MB</strong></span>
              <span>·</span>
              <span>Supported: <strong>EXE · DLL · PDF · APK · Scripts (.ps1, .sh, .py) · Archives (.zip)</strong></span>
            </div>
          </div>

          {/* Quick Sample Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Try a demo artifact:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  loadSampleFile(
                    "signed_security_tool.exe",
                    "MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00\xb8\x00\x00\x00\x00\x00\x00\x00@\x00\x00\x00DemoPEPayloadWithAuthenticodeCertData",
                    "application/x-dosexec"
                  )
                }
                className="px-3 py-1.5 rounded-xl neu-button text-xs font-medium text-text-primary hover:text-primary transition-colors"
              >
                signed_pe.exe
              </button>
              <button
                type="button"
                onClick={() =>
                  loadSampleFile(
                    "corporate_policy.pdf",
                    "%PDF-1.7\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n142\n%%EOF",
                    "application/pdf"
                  )
                }
                className="px-3 py-1.5 rounded-xl neu-button text-xs font-medium text-text-primary hover:text-primary transition-colors"
              >
                corporate_policy.pdf
              </button>
              <button
                type="button"
                onClick={() =>
                  loadSampleFile(
                    "deploy_automation.ps1",
                    "# Remote deployment automation script\nParam([string]$TargetHost)\nWrite-Output 'Executing deterministic verification on target'\nGet-Process | Select-Object -First 5",
                    "text/plain"
                  )
                }
                className="px-3 py-1.5 rounded-xl neu-button text-xs font-medium text-text-primary hover:text-primary transition-colors"
              >
                deploy_automation.ps1
              </button>
            </div>
          </div>

          {/* Action Trigger */}
          {selectedFile && !analyzing && (
            <div className="flex justify-end pt-4 border-t border-border/60">
              <Button
                onClick={executeAnalysis}
                size="lg"
                variant="primary"
                className="text-base font-semibold px-8 py-3.5 shadow-md"
                icon={<ArrowRight className="w-5 h-5" />}
              >
                Analyze File
              </Button>
            </div>
          )}

          {/* 8-Stage Animated Progress Timeline */}
          {analyzing && (
            <div className="p-6 sm:p-7 rounded-3xl neu-inset bg-surface-0/60 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-text-primary flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-primary animate-spin" />
                    <span>Analyzing {selectedFile?.name}…</span>
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Zero dynamic code execution · Strict static memory quarantine
                  </p>
                </div>
                <span className="text-xs font-mono text-primary font-bold">
                  STEP {analysisStep} of 8: {stages[analysisStep - 1]?.label || "Processing"}
                </span>
              </div>

              {/* Interactive Telemetry Node Pipeline Graph */}
              <div className="p-4 sm:p-5 rounded-2xl neu-inset-sm bg-surface-0/70 border border-border/70 overflow-hidden">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-mono font-bold tracking-wider uppercase text-text-muted">
                    Static Telemetry Pipeline
                  </span>
                  <span className="font-mono text-primary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span className="text-[11px] font-semibold">Active In-Memory Stream</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto py-2">
                  {pipelineNodes.map((node, i) => {
                    const isNodeCompleted = analysisStep >= node.stage;
                    const isNodeActive = !isNodeCompleted && (i === 0 || analysisStep >= pipelineNodes[i - 1].stage);
                    const NodeIcon = node.icon;

                    return (
                      <React.Fragment key={node.id}>
                        {/* Node Card */}
                        <div className="flex flex-col items-center min-w-[70px] sm:min-w-[84px] shrink-0">
                          <div
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative ${
                              isNodeCompleted
                                ? "neu-raised-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                : isNodeActive
                                ? "neu-inset bg-primary/20 border border-primary text-primary shadow-[0_0_14px_rgba(59,130,246,0.35)] scale-105"
                                : "neu-button bg-surface-0 border border-border/50 text-text-muted opacity-50"
                            }`}
                          >
                            <NodeIcon className={`w-5 h-5 ${isNodeActive ? "animate-pulse" : ""}`} />
                            {isNodeActive && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                            )}
                          </div>
                          <span
                            className={`text-[10px] sm:text-xs font-mono font-bold mt-1.5 ${
                              isNodeCompleted
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isNodeActive
                                ? "text-primary"
                                : "text-text-muted"
                            }`}
                          >
                            {node.label}
                          </span>
                          <span className="text-[9px] font-sans text-text-muted truncate max-w-[74px]">
                            {node.sub}
                          </span>
                        </div>

                        {/* Conduit line between nodes */}
                        {i < pipelineNodes.length - 1 && (
                          <div className="flex-1 h-1 min-w-[14px] sm:min-w-[24px] rounded-full relative overflow-hidden bg-surface-2 self-center -mt-5">
                            {(isNodeCompleted || isNodeActive) && (
                              <div className="absolute inset-0 bg-gradient-to-r from-primary via-emerald-400 to-primary conduit-flow" />
                            )}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden neu-inset-sm">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(analysisStep / 8) * 100}%` }}
                />
              </div>

              {/* Responsive 8-Step Timeline */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {stages.map((stg) => {
                  const isCompleted = analysisStep > stg.id;
                  const isRunning = analysisStep === stg.id;
                  const isFailed = failedStep === stg.id;

                  return (
                    <div
                      key={stg.id}
                      className={`p-2.5 rounded-xl border text-center transition-all duration-200 flex flex-col justify-between ${
                        isCompleted
                          ? "neu-inset-sm bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : isRunning
                          ? "neu-inset bg-primary/20 border-primary/50 text-primary font-bold animate-pulse"
                          : isFailed
                          ? "neu-inset bg-rose-500/20 border-rose-500/50 text-rose-600"
                          : "neu-button bg-surface-0 border-border/50 text-text-muted"
                      }`}
                    >
                      <div className="text-[9px] uppercase tracking-wider font-bold mb-1">
                        STEP {stg.id}
                      </div>
                      <div className="text-[11px] font-semibold leading-tight line-clamp-2">
                        {stg.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Analysis Results — Professional Security Report Interface */}
      {scanResult && (
        <div className="space-y-7 animate-fadeIn">
          {/* Top Actions: Reset & Report */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setScanResult(null);
                setSelectedFile(null);
              }}
              className="text-sm font-semibold text-text-secondary hover:text-text-primary flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Analyze Another File</span>
            </button>

            {onGenerateReport && (
              <Button
                size="md"
                variant="primary"
                onClick={() => onGenerateReport(scanResult.scan_id)}
                icon={<FileText className="w-4 h-4" />}
                className="shadow-md font-semibold"
              >
                Generate Security Report
              </Button>
            )}
          </div>

          {/* 1. TOP SUMMARY CARD: File Name, Type, SHA-256, Size, Risk Score & Gauge */}
          <Card surface="raised" className="p-8 sm:p-10 space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center md:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <Badge variant={getVerdictBadgeVariant(scanResult.verdict.level)} size="md">
                    {scanResult.verdict.level} RISK
                  </Badge>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg neu-inset-sm text-text-muted">
                    {scanResult.file.type} Binary
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg neu-inset-sm text-emerald-600 dark:text-emerald-400">
                    Zero Dynamic Code Execution
                  </span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
                  {scanResult.file.name}
                </h2>

                <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-2xl">
                  {scanResult.verdict.level === "SAFE"
                    ? "Artifact demonstrated clean static structures and valid certificate integrity. Zero malicious indicators detected."
                    : scanResult.verdict.level === "LOW"
                    ? "Minimal non-standard indicators observed. No high-severity exploits or dangerous API calls detected."
                    : scanResult.verdict.level === "MEDIUM"
                    ? "Suspicious entropy variations or unsigned executable binary characteristics require operator review."
                    : "High-risk signals detected. Binary exhibits abnormal structural tampering or critical entropy anomalies."}
                </p>

                {/* Core Metadata Row: SHA-256, Type, Size, Authenticode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
                  <div className="p-3 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-xs text-text-muted font-medium">SHA-256 Digest</div>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className="font-mono text-xs font-bold text-text-primary truncate">
                        {scanResult.file.sha256.substring(0, 14)}…
                      </span>
                      <button
                        onClick={() => copyHash(scanResult.file.sha256)}
                        className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all duration-200 ${
                          copiedHash
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold"
                            : "text-text-muted hover:text-text-primary neu-button"
                        }`}
                        title="Copy full SHA-256 hash"
                      >
                        {copiedHash ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-xs text-text-muted font-medium">File Format</div>
                    <div className="font-semibold text-xs sm:text-sm text-text-primary mt-0.5 truncate">
                      {scanResult.file.type}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-xs text-text-muted font-medium">File Size</div>
                    <div className="font-semibold text-xs sm:text-sm text-text-primary mt-0.5">
                      {formatBytes(scanResult.file.size)}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-xs text-text-muted font-medium">Authenticode Signature</div>
                    <div className="font-semibold text-xs sm:text-sm text-text-primary mt-0.5 truncate">
                      {scanResult.signature_info?.is_signed ? "Signed" : "Unsigned"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Radial Risk Gauge */}
              <div className="shrink-0 flex flex-col items-center">
                <ScoreRing
                  score={safeNumber(scanResult.verdict.score, 0)}
                  variant="risk"
                  size={150}
                  strokeWidth={11}
                  label="Risk Score"
                />
              </div>
            </div>
          </Card>

          {/* 2. DIGITAL SIGNATURE & CERTIFICATE AUTHENTICITY */}
          <Card surface="raised" className="p-7 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center space-x-2.5">
                {scanResult.signature_info?.is_signed ? (
                  <Lock className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Unlock className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    Digital Signature & Certificate Authenticity
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Authenticode PKCS#7 signature verification and X.509 certificate chain validation.
                  </p>
                </div>
              </div>
              <Badge
                variant={scanResult.signature_info?.is_signed ? "safe" : "neutral"}
                size="md"
              >
                {scanResult.signature_info?.is_signed ? "SIGNED" : "UNSIGNED"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60 space-y-1">
                <div className="text-text-muted text-[11px] font-sans">Certificate Subject</div>
                <div className="font-bold text-text-primary break-all">
                  {scanResult.signature_info?.signer_name || scanResult.signature_info?.certificates?.[0]?.subject || "None (Unsigned Binary)"}
                </div>
              </div>

              <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60 space-y-1">
                <div className="text-text-muted text-[11px] font-sans">Certificate Issuer</div>
                <div className="font-bold text-text-primary break-all">
                  {scanResult.signature_info?.issuer_name || scanResult.signature_info?.certificates?.[0]?.issuer || "None"}
                </div>
              </div>

              <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60 space-y-1">
                <div className="text-text-muted text-[11px] font-sans">Validity & Expiration</div>
                <div className="font-bold text-text-primary">
                  {scanResult.signature_info?.certificates?.[0]?.not_after || "No expiry recorded"}
                </div>
              </div>

              <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60 space-y-1">
                <div className="text-text-muted text-[11px] font-sans">Chain Status</div>
                <div className={`font-bold ${scanResult.signature_info?.is_signed ? "text-emerald-500" : "text-text-muted"}`}>
                  {scanResult.signature_info?.is_signed ? "Valid Trusted Chain" : "No Chain Present"}
                </div>
              </div>

              <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60 space-y-1">
                <div className="text-text-muted text-[11px] font-sans">Verification Result</div>
                <div className="font-bold text-primary">
                  {scanResult.signature_info?.status || (scanResult.signature_info?.is_signed ? "VALID" : "NOT_SIGNED")}
                </div>
              </div>

              <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60 space-y-1">
                <div className="text-text-muted text-[11px] font-sans">Cryptographic Hash Type</div>
                <div className="font-bold text-text-primary">
                  {scanResult.signature_info?.digest_algorithm || scanResult.signature_info?.certificates?.[0]?.signature_algorithm || "SHA-256 with RSA"}
                </div>
              </div>
            </div>
          </Card>

          {/* 3. EVIDENCE-BASED FINDINGS (EXPANDABLE ROWS) */}
          <Card surface="raised" className="p-7 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  Evidence-Based Findings ({scanResult.findings.length})
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Expandable telemetry rows with technical rationale, forensic evidence, and source engines.
                </p>
              </div>
            </div>

            {scanResult.findings.length === 0 ? (
              <div className="p-5 rounded-2xl neu-inset-sm bg-surface-0/60 text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5" />
                <span>Zero adverse findings detected. All deterministic safety invariants satisfied.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {scanResult.findings.map((f, idx) => {
                  const isExpanded = !!expandedFindings[f.id];
                  return (
                    <div
                      key={f.id}
                      style={{ animationDelay: `${idx * 80}ms` }}
                      className="rounded-2xl neu-inset-sm bg-surface-0/50 border border-border/60 overflow-hidden transition-all duration-150 animate-fadeIn"
                    >
                      {/* Clickable Header Row */}
                      <div
                        onClick={() => toggleFindingExpanded(f.id)}
                        className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-surface-0/80 select-none"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <Badge variant={getVerdictBadgeVariant(f.severity)} size="sm">
                            {f.severity}
                          </Badge>
                          <span className="font-bold text-sm text-text-primary truncate">
                            {f.title}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="hidden sm:inline text-xs font-mono text-text-muted">
                            Engine: {f.source_engine}
                          </span>
                          <button
                            type="button"
                            className="p-1 rounded text-text-muted hover:text-text-primary"
                            aria-label={isExpanded ? "Collapse finding" : "Expand finding"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Finding Details */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-3 animate-fadeIn text-xs">
                          <div>
                            <span className="font-semibold text-text-primary">Explanation: </span>
                            <span className="text-text-secondary leading-relaxed">{f.description}</span>
                          </div>

                          <div className="p-3 rounded-xl neu-inset-sm bg-surface-0/70 font-mono text-[11px] space-y-1">
                            <div className="text-text-muted font-sans font-semibold">Forensic Evidence & Source:</div>
                            <div className="text-text-primary">Source Engine: <strong>{f.source_engine}</strong></div>
                            <div className="text-text-primary">Confidence: <strong>{f.confidence}</strong></div>
                            {f.evidence && (
                              <div className="text-text-secondary mt-1">
                                Evidence Output: {typeof f.evidence === "object" ? JSON.stringify(f.evidence) : String(f.evidence)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 4. PROGRESSIVE DISCLOSURE: TECHNICAL EVIDENCE & ENTROPY */}
          <Card surface="raised" className="p-6 sm:p-7 space-y-4">
            <div
              onClick={() => setShowTechEvidence(!showTechEvidence)}
              className="flex items-center justify-between cursor-pointer select-none py-1"
            >
              <div className="flex items-center space-x-2.5">
                <Info className="w-5 h-5 text-primary" />
                <h3 className="text-base sm:text-lg font-bold text-text-primary">
                  Technical Evidence & Entropy Telemetry
                </h3>
              </div>
              <button className="p-2 rounded-xl neu-button text-text-muted hover:text-text-primary transition-colors">
                {showTechEvidence ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showTechEvidence && (
              <div className="space-y-4 pt-2 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-text-muted">Shannon Entropy</div>
                    <div className="text-lg font-bold text-text-primary mt-1">
                      {typeof scanResult.metadata?.entropy?.shannon === "number"
                        ? scanResult.metadata.entropy.shannon.toFixed(3)
                        : "0.000"} / 8.000
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">High entropy indicates packing/encryption</div>
                  </div>

                  <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-text-muted">Suspicious Sections</div>
                    <div className="text-lg font-bold text-text-primary mt-1">
                      {scanResult.metadata?.entropy?.suspicious_sections?.length || 0}
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">Sections with &gt; 7.200 entropy</div>
                  </div>

                  <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-text-muted">Execution Model</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      Strict Static Only
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">Zero dynamic code execution</div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* 5. PROGRESSIVE DISCLOSURE: RAW METADATA ▾ */}
          <Card surface="raised" className="p-6 sm:p-7 space-y-4">
            <div
              onClick={() => setShowRawMetadata(!showRawMetadata)}
              className="flex items-center justify-between cursor-pointer select-none py-1"
            >
              <div className="flex items-center space-x-2.5">
                <Layers className="w-5 h-5 text-purple-500" />
                <h3 className="text-base sm:text-lg font-bold text-text-primary">
                  Raw Forensic Metadata
                </h3>
              </div>
              <button className="p-2 rounded-xl neu-button text-text-muted hover:text-text-primary transition-colors">
                {showRawMetadata ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showRawMetadata && (
              <div className="p-4 rounded-2xl neu-inset bg-surface-0/80 font-mono text-[11px] text-text-secondary overflow-x-auto max-h-72 animate-fadeIn">
                <pre>{JSON.stringify(scanResult, null, 2)}</pre>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
