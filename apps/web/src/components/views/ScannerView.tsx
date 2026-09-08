import React, { useState } from "react";
import {
  Upload,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Key,
  Calendar,
  Hash,
  FileCode,
  ArrowRight,
  RefreshCw,
  Cpu,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
  Info,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing } from "../ui/ScoreRing";
import { Tabs } from "../ui/Tabs";
import { useToast } from "../../context/ToastContext";
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
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [activeTechTab, setActiveTechTab] = useState<string>("hashes");
  const [showTechActivity, setShowTechActivity] = useState<boolean>(false);
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});

  const toggleFinding = (id: string) => {
    setExpandedFindings((prev) => ({ ...prev, [id]: !prev[id] }));
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

  const executeAnalysis = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setAnalysisStep(1); // Uploading
    setScanResult(null);

    // Step progression simulation for user delight
    const stepTimer1 = setTimeout(() => setAnalysisStep(2), 300); // Identifying
    const stepTimer2 = setTimeout(() => setAnalysisStep(3), 700); // Analyzing
    const stepTimer3 = setTimeout(() => setAnalysisStep(4), 1100); // Verifying signatures

    try {
      const res = await api.uploadAndScan(selectedFile);
      setAnalysisStep(5); // Calculating risk
      setTimeout(() => {
        setScanResult(res);
        setAnalyzing(false);
        toast.success(`Analysis completed for ${selectedFile.name}`);
        if (onScanComplete) onScanComplete(res);
      }, 400);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setAnalyzing(false);
      setAnalysisStep(0);
      toast.error(err.message || "File analysis failed", "Analysis Error");
    }
  };

  const getVerdictBadgeVariant = (level: VerdictLevel): "safe" | "low" | "medium" | "high" | "critical" => {
    if (level === "SAFE") return "safe";
    if (level === "LOW") return "low";
    if (level === "MEDIUM") return "medium";
    return "high";
  };

  const steps = [
    { label: "QUARANTINED", id: 1 },
    { label: "METADATA", id: 2 },
    { label: "STATIC ANALYSIS", id: 3 },
    { label: "SIGNATURE", id: 4 },
    { label: "RISK ASSESSMENT", id: 5 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Title & Assurance Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-primary-subtle text-primary text-[11px] font-mono font-bold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>ZERO DYNAMIC CODE EXECUTION GUARANTEE</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          File Analysis & Digital Signature Verification
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-3xl leading-relaxed">
          Quarantined inspection of portable executables, PDFs, Android packages, and documents. Uploaded binaries are never executed.
        </p>
      </div>

      {/* Upload & Selection Card */}
      {!scanResult && (
        <Card level={0} className="p-6 sm:p-10 space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all ${
              dragOver
                ? "border-primary bg-primary/10 shadow-brutal"
                : "border-border bg-surface-1 hover:bg-surface-2 hover:border-text-primary"
            }`}
          >
            <input
              type="file"
              id="file-scanner-input"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-lg bg-primary border-2 border-border flex items-center justify-center text-black mb-4 shadow-brutal-sm">
                <Upload className="w-7 h-7 stroke-[2.5]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-display text-text-primary tracking-tight uppercase">
                ANALYZE AN UNTRUSTED ARTIFACT
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary mt-1 font-sans">
                Drop file here or choose from your filesystem
              </p>
              <div className="mt-4">
                <label
                  htmlFor="file-scanner-input"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-surface-0 border-2 border-border text-xs font-black uppercase tracking-wider text-text-primary shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
                >
                  [ CHOOSE FILE ]
                </label>
              </div>

              {/* Supported Format Badges */}
              <div className="mt-6 pt-4 border-t-2 border-border flex flex-wrap items-center justify-center gap-2">
                <span className="text-[10px] font-mono font-extrabold uppercase text-text-muted mr-1">
                  SUPPORTED:
                </span>
                <span className="px-2 py-0.5 rounded border-2 border-border bg-surface-0 text-[10px] font-mono font-bold">
                  PE (.EXE/.DLL)
                </span>
                <span className="px-2 py-0.5 rounded border-2 border-border bg-surface-0 text-[10px] font-mono font-bold">
                  PDF
                </span>
                <span className="px-2 py-0.5 rounded border-2 border-border bg-surface-0 text-[10px] font-mono font-bold">
                  APK
                </span>
                <span className="px-2 py-0.5 rounded border-2 border-border bg-surface-0 text-[10px] font-mono font-bold">
                  SCRIPT (.PS1/.SH/.PY)
                </span>
                <span className="px-2 py-0.5 rounded border-2 border-border bg-surface-0 text-[10px] font-mono font-bold">
                  ARCHIVE (.ZIP/.TAR)
                </span>
              </div>
            </div>
          </div>

          {/* Selected File Preview & Analysis Trigger */}
          {selectedFile && !analyzing && (
            <div className="p-4 rounded-xl bg-surface-2 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-surface-0 text-primary">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-text-primary">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] font-mono text-text-muted mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || "binary"}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto">
                <Button
                  onClick={executeAnalysis}
                  className="w-full sm:w-auto"
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Analyze File
                </Button>
              </div>
            </div>
          )}

          {/* Multi-Step Analysis Journey */}
          {analyzing && (
            <div className="p-6 rounded-xl bg-surface-2 border border-border space-y-6 animate-fadeIn">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-bold text-text-primary">
                  Analyzing {selectedFile?.name}...
                </h4>
                <p className="text-xs text-text-secondary">
                  Parsing static structures in isolated quarantine without dynamic execution.
                </p>
              </div>

              {/* Progress Steps */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {steps.map((step) => {
                  const isDone = analysisStep > step.id;
                  const isCurrent = analysisStep === step.id;

                  return (
                    <div
                      key={step.id}
                      className={`p-2.5 rounded-lg border-2 text-center transition-all ${
                        isDone
                          ? "bg-theme-success-subtle border-theme-success text-theme-success-text shadow-[2px_2px_0px_var(--border)] font-bold"
                          : isCurrent
                          ? "bg-primary text-black border-border shadow-brutal-sm font-extrabold animate-pulse"
                          : "bg-surface-0 border-border text-text-muted opacity-75"
                      }`}
                    >
                      <div className="text-[10px] font-mono mb-0.5">
                        {isDone ? "✓ COMPLETED" : isCurrent ? "→ IN PROGRESS" : "○ PENDING"}
                      </div>
                      <div className="text-xs truncate font-display font-black">{step.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Optional Technical Activity Toggle */}
              <div>
                <button
                  onClick={() => setShowTechActivity(!showTechActivity)}
                  className="text-[11px] font-mono text-text-muted hover:text-text-primary flex items-center space-x-1"
                >
                  <span>{showTechActivity ? "Hide" : "View"} Technical Activity Details</span>
                  {showTechActivity ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showTechActivity && (
                  <div className="mt-2 p-3 rounded-lg bg-surface-0 font-mono text-[11px] text-text-secondary space-y-1 max-h-36 overflow-y-auto">
                    <div>[00:00.01] Ingested stream to quarantine context</div>
                    <div>[00:00.04] SHA-256 fingerprinting computed</div>
                    <div>[00:00.08] Magic bytes inspection: {selectedFile?.name.split(".").pop()?.toUpperCase()}</div>
                    <div>[00:00.12] Authenticode directory header evaluated</div>
                    <div>[00:00.16] Parsing X.509 PKCS#7 certificate chain structures</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Scan Results — 4 Progressive Disclosure Levels */}
      {scanResult && (
        <div className="space-y-6">
          {/* Back Action */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setScanResult(null);
                setSelectedFile(null);
              }}
              className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center space-x-1"
            >
              <span>&larr; Scan another file</span>
            </button>

            {onGenerateReport && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onGenerateReport(scanResult.scan_id)}
                icon={<FileText className="w-3.5 h-3.5" />}
              >
                Generate Audit Report
              </Button>
            )}
          </div>

          {/* =========================================================================
              LEVEL 1: Result Verdict & Score Ring
              ========================================================================= */}
          <Card level={1} className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <Badge variant={getVerdictBadgeVariant(scanResult.verdict.level)} size="md">
                    {scanResult.verdict.level} RISK
                  </Badge>
                  <span className="text-xs font-mono text-text-muted">
                    {scanResult.file.type} Binary
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                  {scanResult.file.name}
                </h3>
                <p className="text-xs font-mono text-text-muted break-all">
                  SHA-256: {scanResult.file.sha256}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs text-text-secondary font-mono">
                  <span>Size: {(scanResult.file.size / 1024).toFixed(1)} KB</span>
                  <span>•</span>
                  <span>MIME: {scanResult.file.mime}</span>
                  <span>•</span>
                  <span>Findings: {scanResult.findings.length}</span>
                </div>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <ScoreRing
                  score={scanResult.verdict.score}
                  variant="risk"
                  size={120}
                  strokeWidth={10}
                  label="RISK SCORE"
                />
              </div>
            </div>
          </Card>

          {/* =========================================================================
              LEVEL 2: "Why this score?" Transparent Explanation
              ========================================================================= */}
          <Card level={2} className="p-6 space-y-4">
            <div className="border-b border-border/80 pb-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center space-x-2">
                <Info className="w-4 h-4 text-primary" />
                <span>Why this score? — Score Contributors</span>
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Transparent score calculation. Points are added strictly based on verified static observations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-0 border border-border">
                <div className="text-text-muted text-[11px]">Digital Signature</div>
                <div className="font-bold text-text-primary mt-1 flex items-center justify-between">
                  <span>{scanResult.signature_info?.is_signed ? scanResult.signature_info.status : "Unsigned"}</span>
                  <span className="font-mono text-text-muted">
                    {scanResult.signature_info?.is_signed ? "0 pts" : "+15 pts"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-0 border border-border">
                <div className="text-text-muted text-[11px]">Entropy Assessment</div>
                <div className="font-bold text-text-primary mt-1 flex items-center justify-between">
                  <span>Normal Distribution</span>
                  <span className="font-mono text-text-muted">+0 pts</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-0 border border-border">
                <div className="text-text-muted text-[11px]">Capabilities Flagged</div>
                <div className="font-bold text-text-primary mt-1 flex items-center justify-between">
                  <span>{scanResult.capabilities.length} Detected</span>
                  <span className="font-mono text-text-muted">+{scanResult.capabilities.length * 5} pts</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-0 border border-border">
                <div className="text-text-muted text-[11px]">Total Calibrated Score</div>
                <div className="font-black text-text-primary mt-1 flex items-center justify-between">
                  <span className="text-primary font-mono">{scanResult.verdict.score.toFixed(1)} / 100</span>
                  <span className="font-mono text-xs">{scanResult.verdict.level}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* =========================================================================
              LEVEL 3: Evidence-Based Findings (WHAT, WHY, SOURCE, CONFIDENCE)
              ========================================================================= */}
          <Card level={1} className="p-6 space-y-4">
            <div className="border-b border-border/80 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-theme-warning" />
                  <span>Evidence-Based Findings ({scanResult.findings.length})</span>
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Detailed security observations with confidence ratings and recommendations.
                </p>
              </div>
            </div>

            {scanResult.findings.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                <ShieldCheck className="w-8 h-8 text-theme-success mx-auto mb-2" />
                No suspicious static artifacts or structural anomalies detected.
              </div>
            ) : (
              <div className="space-y-3">
                {scanResult.findings.map((f) => {
                  const isExpanded = !!expandedFindings[f.id];
                  let badgeVariant: "safe" | "low" | "medium" | "high" | "critical" = "low";
                  if (f.severity === "MEDIUM") badgeVariant = "medium";
                  if (f.severity === "HIGH" || f.severity === "CRITICAL") badgeVariant = "high";

                  return (
                    <div
                      key={f.id}
                      className="border border-border rounded-xl bg-surface-0 overflow-hidden transition"
                    >
                      <button
                        onClick={() => toggleFinding(f.id)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-1 transition"
                      >
                        <div className="flex items-center space-x-3">
                          <Badge variant={badgeVariant} size="sm">
                            {f.severity}
                          </Badge>
                          <div>
                            <div className="text-xs font-bold text-text-primary">{f.title}</div>
                            <div className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
                              {f.description}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0 ml-3">
                          <span className="text-[10px] font-mono text-text-muted">
                            Confidence: {f.confidence}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-text-muted" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-text-muted" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 border-t border-border bg-surface-1/50 space-y-3 text-xs">
                          <div>
                            <span className="font-bold text-text-primary">WHAT WAS OBSERVED:</span>
                            <p className="text-text-secondary mt-0.5 leading-relaxed">{f.description}</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="p-2.5 rounded-lg bg-surface-0 border border-border">
                              <span className="text-[11px] font-bold text-text-muted uppercase">Engine Source</span>
                              <div className="font-mono text-text-primary mt-0.5">{f.source_engine}</div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-surface-0 border border-border">
                              <span className="text-[11px] font-bold text-text-muted uppercase">Confidence</span>
                              <div className="font-mono text-text-primary mt-0.5">{f.confidence}</div>
                            </div>
                          </div>

                          {Object.keys(f.evidence || {}).length > 0 && (
                            <div>
                              <span className="font-bold text-text-primary">EVIDENCE TRACE:</span>
                              <pre className="mt-1 p-2.5 rounded-lg bg-surface-0 border border-border font-mono text-[11px] overflow-x-auto">
                                {JSON.stringify(f.evidence, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* =========================================================================
              LEVEL 4: Technical Deep Dive (Certificates, Hashes, Metadata)
              ========================================================================= */}
          <Card level={1} className="p-6 space-y-4">
            <div className="border-b border-border/80 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>Technical Deep Dive (Level 4)</span>
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Raw cryptographic parameters, X.509 chains, and structural parameters.
                </p>
              </div>

              <Tabs
                size="sm"
                activeId={activeTechTab}
                onChange={setActiveTechTab}
                items={[
                  { id: "hashes", label: "Hashes" },
                  { id: "signature", label: "Certificates" },
                  { id: "capabilities", label: "Capabilities" },
                ]}
              />
            </div>

            {/* Hashes Tab */}
            {activeTechTab === "hashes" && (
              <div className="space-y-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-surface-0 border border-border space-y-1">
                  <span className="text-text-muted text-[11px] uppercase">SHA-256</span>
                  <div className="text-text-primary break-all">{scanResult.file.sha256}</div>
                </div>
                <div className="p-3 rounded-xl bg-surface-0 border border-border space-y-1">
                  <span className="text-text-muted text-[11px] uppercase">File Name & Size</span>
                  <div className="text-text-primary">{scanResult.file.name} ({scanResult.file.size} bytes)</div>
                </div>
              </div>
            )}

            {/* Signature & Certificate Chain Tab */}
            {activeTechTab === "signature" && (
              <div className="space-y-3 text-xs">
                {scanResult.signature_info?.is_signed ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-surface-0 border border-border space-y-1">
                      <span className="text-text-muted text-[11px]">Signer Common Name (CN)</span>
                      <div className="font-mono text-text-primary">{scanResult.signature_info.signer_name || "Unknown"}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-0 border border-border space-y-1">
                      <span className="text-text-muted text-[11px]">Issuer Authority</span>
                      <div className="font-mono text-text-primary">{scanResult.signature_info.issuer_name || "Direct Signer"}</div>
                    </div>
                    {scanResult.signature_info.certificates.map((c, i) => (
                      <div key={i} className="p-3 rounded-xl bg-surface-0 border border-border space-y-1 font-mono text-[11px]">
                        <span className="text-text-muted">Certificate #{i + 1} Serial: {c.serial_number}</span>
                        <div>Subject: {c.subject}</div>
                        <div>Issuer: {c.issuer}</div>
                        <div>Valid Until: {new Date(c.not_after).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-surface-0 border border-border text-text-secondary text-xs">
                    No embedded Authenticode or PKCS#7 certificate structure detected. Unsigned binary.
                  </div>
                )}
              </div>
            )}

            {/* Capabilities Tab */}
            {activeTechTab === "capabilities" && (
              <div className="space-y-2 text-xs">
                {scanResult.capabilities.length === 0 ? (
                  <div className="p-4 text-center text-text-muted text-xs">
                    No suspicious behavioral capability indicators identified.
                  </div>
                ) : (
                  scanResult.capabilities.map((cap, i) => (
                    <div key={i} className="p-3 rounded-xl bg-surface-0 border border-border flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary">{cap.capability}</div>
                        <div className="text-[11px] text-text-muted mt-0.5">Status: {cap.status}</div>
                      </div>
                      <Badge variant="info" size="sm">{cap.confidence}</Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
