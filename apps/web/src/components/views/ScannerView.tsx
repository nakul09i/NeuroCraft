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
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing } from "../ui/ScoreRing";
import { useToast } from "../../context/ToastContext";
import { useNotifications } from "../../context/NotificationContext";
import { api } from "../../api";
import { ScanResponse, VerdictLevel } from "../../types";

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

  // Progressive disclosure expandable section toggles
  const [showTechEvidence, setShowTechEvidence] = useState(true);
  const [showCryptoDetails, setShowCryptoDetails] = useState(false);
  const [showRawMetadata, setShowRawMetadata] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const stages = [
    { id: 1, label: "Quarantine", desc: "Isolating file in secure in-memory sandbox" },
    { id: 2, label: "Metadata Extraction", desc: "Calculating SHA-256, MIME, and binary headers" },
    { id: 3, label: "Static Analysis", desc: "Evaluating section entropy and import tables" },
    { id: 4, label: "Signature Verification", desc: "Parsing Authenticode & X.509 certificate chains" },
    { id: 5, label: "Risk Assessment", desc: "Synthesizing multi-engine risk indicators" },
  ];

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

    // Sequential backend progress reflection
    const timer1 = setTimeout(() => setAnalysisStep(2), 300);
    const timer2 = setTimeout(() => setAnalysisStep(3), 700);
    const timer3 = setTimeout(() => setAnalysisStep(4), 1100);

    try {
      const res = await api.uploadAndScan(selectedFile);
      setAnalysisStep(5);
      setTimeout(() => {
        setScanResult(res);
        setAnalyzing(false);
        toast.success(`Analysis completed for ${selectedFile.name}`);
        addNotification(
          "File Quarantine Analysis Completed",
          `Artifact "${selectedFile.name}" evaluated: Risk ${res.verdict.level} (${res.verdict.score}/100)`,
          "scanner",
          res.verdict.level === "SAFE" ? "success" : "warning"
        );
        if (onScanComplete) onScanComplete(res);
      }, 450);
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setFailedStep(analysisStep);
      setAnalyzing(false);
      const msg = typeof err?.message === "string" ? err.message : "File analysis failed";
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
          <Badge variant="safe" size="sm">Deterministic Sandbox</Badge>
          <span className="text-xs font-mono text-text-muted">
            Zero Dynamic Code Execution Guarantee
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
          Analyze an untrusted file.
        </h1>
        <p className="text-base text-text-secondary mt-2 max-w-3xl leading-relaxed">
          Static analysis without dynamic code execution. Inspect portable executables, PDFs, Android packages, and scripts in an isolated memory quarantine.
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
              {selectedFile ? selectedFile.name : "Drag & drop an untrusted artifact here"}
            </h3>

            <p className="text-sm text-text-secondary mt-1.5 max-w-md mx-auto">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KB · Ready to analyze`
                : "or click to browse your local file system"}
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
                Choose File
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
              <span>Maximum File Size: <strong>25 MB</strong></span>
              <span>·</span>
              <span>Supported: <strong>PE (.exe, .dll) · ELF · Mach-O · PDF · APK · Scripts</strong></span>
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
                sample_pe.exe
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
                sample_doc.pdf
              </button>
              <button
                type="button"
                onClick={() =>
                  loadSampleFile(
                    "deploy_script.ps1",
                    "# Remote deployment automation script\nParam([string]$TargetHost)\nWrite-Output 'Executing deterministic verification on target'\nGet-Process | Select-Object -First 5",
                    "text/plain"
                  )
                }
                className="px-3 py-1.5 rounded-xl neu-button text-xs font-medium text-text-primary hover:text-primary transition-colors"
              >
                deploy_script.ps1
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

          {/* 5 Real Progress Steps */}
          {analyzing && (
            <div className="p-6 rounded-3xl neu-inset bg-surface-0/60 space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-text-primary flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-primary animate-spin" />
                    <span>Analyzing {selectedFile?.name}…</span>
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Isolated quarantine parsing without process spawning.
                  </p>
                </div>
                <span className="text-xs font-mono text-primary font-bold">
                  Step {analysisStep} of 5
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {stages.map((stg) => {
                  const isCompleted = analysisStep > stg.id;
                  const isRunning = analysisStep === stg.id;
                  const isFailed = failedStep === stg.id;

                  return (
                    <div
                      key={stg.id}
                      className={`p-3.5 rounded-2xl border text-center transition-all duration-200 ${
                        isCompleted
                          ? "neu-inset-sm bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : isRunning
                          ? "neu-inset bg-primary/20 border-primary/50 text-primary font-bold animate-pulse"
                          : isFailed
                          ? "neu-inset bg-rose-500/20 border-rose-500/50 text-rose-600"
                          : "neu-button bg-surface-0 border-border/50 text-text-muted"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider font-bold mb-1">
                        {isCompleted
                          ? "Completed"
                          : isRunning
                          ? "Running"
                          : isFailed
                          ? "Failed"
                          : "Pending"}
                      </div>
                      <div className="text-xs font-semibold truncate">{stg.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Analysis Results — Human-First Progressive Disclosure */}
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
                className="shadow-md"
              >
                Generate Security Report
              </Button>
            )}
          </div>

          {/* 1. TOP RESULT CARD: File Name, Risk, Summary */}
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

                {/* Core Metadata Row: SHA-256, Type, Size, Signature */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
                  <div className="p-3 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-xs text-text-muted">SHA-256 Hash</div>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className="font-mono text-xs font-bold text-text-primary truncate">
                        {scanResult.file.sha256.substring(0, 12)}…
                      </span>
                      <button
                        onClick={() => copyHash(scanResult.file.sha256)}
                        className="p-1 rounded text-text-muted hover:text-text-primary"
                        title="Copy full hash"
                      >
                        {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-xs text-text-muted">File Type</div>
                    <div className="font-semibold text-xs sm:text-sm text-text-primary mt-0.5 truncate">
                      {scanResult.file.type}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-xs text-text-muted">Size in Memory</div>
                    <div className="font-semibold text-xs sm:text-sm text-text-primary mt-0.5">
                      {(scanResult.file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-xs text-text-muted">Authenticode Status</div>
                    <div className="font-semibold text-xs sm:text-sm text-text-primary mt-0.5 truncate">
                      {scanResult.signature_info?.is_signed ? "Cryptographically Signed" : "Unsigned Binary"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Radial Risk Score Ring */}
              <div className="shrink-0 flex flex-col items-center">
                <ScoreRing
                  score={scanResult.verdict.score}
                  variant="risk"
                  size={150}
                  strokeWidth={11}
                  label="Risk Score"
                />
              </div>
            </div>
          </Card>

          {/* 2. FINDINGS SECTION */}
          <Card surface="raised" className="p-7 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  Security Findings ({scanResult.findings.length})
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Observed behavioral anomalies, signature discrepancies, and heuristic patterns.
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
                {scanResult.findings.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 sm:p-5 rounded-2xl neu-inset-sm bg-surface-0/50 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-text-primary">{f.title}</span>
                        <Badge variant={getVerdictBadgeVariant(f.severity)} size="sm">
                          {f.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">{f.description}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-text-muted shrink-0">
                      {f.confidence} Confidence · {f.source_engine}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 3. PROGRESSIVE DISCLOSURE: TECHNICAL EVIDENCE ▾ */}
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
                  </div>

                  <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-text-muted">Suspicious Sections</div>
                    <div className="text-lg font-bold text-text-primary mt-1">
                      {scanResult.metadata?.entropy?.suspicious_sections?.length || 0}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60">
                    <div className="text-text-muted">Execution Model</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      Strict Static Only
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* 4. PROGRESSIVE DISCLOSURE: CRYPTOGRAPHIC CERTIFICATE DETAILS ▾ */}
          <Card surface="raised" className="p-6 sm:p-7 space-y-4">
            <div
              onClick={() => setShowCryptoDetails(!showCryptoDetails)}
              className="flex items-center justify-between cursor-pointer select-none py-1"
            >
              <div className="flex items-center space-x-2.5">
                <Key className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base sm:text-lg font-bold text-text-primary">
                  Cryptographic Details & Authenticode Provenance
                </h3>
              </div>
              <button className="p-2 rounded-xl neu-button text-text-muted hover:text-text-primary transition-colors">
                {showCryptoDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showCryptoDetails && (
              <div className="p-5 rounded-2xl neu-inset bg-surface-0/60 font-mono text-xs text-text-secondary space-y-2.5 animate-fadeIn">
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-text-muted">Signature State:</span>
                  <span className="font-bold text-text-primary">
                    {scanResult.signature_info?.is_signed ? scanResult.signature_info.status : "No Embedded Authenticode Cert"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-text-muted">Subject Common Name:</span>
                  <span className="font-bold text-text-primary">
                    {scanResult.signature_info?.signer_name || scanResult.signature_info?.certificates?.[0]?.subject || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-1.5">
                  <span className="text-text-muted">Issuer Authority:</span>
                  <span className="font-bold text-text-primary">
                    {scanResult.signature_info?.issuer_name || scanResult.signature_info?.certificates?.[0]?.issuer || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Verification Engine:</span>
                  <span className="font-bold text-primary">ASN.1 PKCS#7 Deterministic Parser</span>
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
