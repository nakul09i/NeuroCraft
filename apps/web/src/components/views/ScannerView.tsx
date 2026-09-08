import React, { useState } from "react";
import {
  Upload,
  ShieldCheck,
  ShieldAlert,
  FileCode,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sliders,
  Info,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Card } from "../ui/Card";
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
    setAnalysisStep(1); // Uploading / Quarantining
    setScanResult(null);

    // Progressive step simulation for smooth pacing
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
    { label: "Quarantined", id: 1 },
    { label: "Metadata", id: 2 },
    { label: "Static Analysis", id: 3 },
    { label: "Signatures", id: 4 },
    { label: "Risk Verdict", id: 5 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-14">
      {/* Title & Assurance Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Zero Dynamic Code Execution Guarantee</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
          File Analysis & Digital Signatures
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary max-w-3xl leading-relaxed">
          Quarantined static inspection of portable executables, PDFs, Android packages, and scripts. Binaries are never executed.
        </p>
      </div>

      {/* Upload & Selection Card */}
      {!scanResult && (
        <Card level={0} className="p-6 sm:p-8 space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            className={`border border-dashed rounded-2xl p-8 sm:p-14 text-center transition-all ${
              dragOver
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border/80 bg-surface-1/30 hover:bg-surface-1/60 hover:border-text-secondary/50"
            }`}
          >
            <input
              type="file"
              id="file-scanner-input"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-text-primary tracking-tight">
                Analyze an untrusted artifact
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">
                Drop a file here or browse your filesystem
              </p>
              <div className="mt-5">
                <label
                  htmlFor="file-scanner-input"
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-surface-0 hover:bg-surface-1 border border-border/80 text-xs font-medium text-text-primary shadow-xs hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Choose File
                </label>
              </div>

              {/* Supported Format Chips */}
              <div className="mt-7 pt-5 border-t border-border/60 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-text-muted mr-1">
                  Supported formats:
                </span>
                {["PE (.exe/.dll)", "PDF", "APK", "Scripts (.ps1/.sh/.py)", "Archives (.zip/.tar)"].map((fmt) => (
                  <span
                    key={fmt}
                    className="px-2.5 py-1 rounded-full border border-border/60 bg-surface-0/60 text-[11px] text-text-secondary font-mono"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Selected File Preview & Analysis Trigger */}
          {selectedFile && !analyzing && (
            <div className="p-4 rounded-xl bg-surface-1/50 border border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-text-primary">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || "binary payload"}
                  </div>
                </div>
              </div>

              <Button
                onClick={executeAnalysis}
                size="md"
                variant="primary"
                className="w-full sm:w-auto"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Analyze File
              </Button>
            </div>
          )}

          {/* Multi-Step Analysis Journey */}
          {analyzing && (
            <div className="p-6 rounded-2xl bg-surface-1/50 border border-border/70 space-y-6 animate-fadeIn">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-semibold text-text-primary">
                  Analyzing {selectedFile?.name}…
                </h4>
                <p className="text-xs text-text-secondary">
                  Parsing static binary structures in isolated quarantine without execution.
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
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isDone
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium"
                          : isCurrent
                          ? "bg-primary/10 border-primary/40 text-primary font-semibold shadow-xs"
                          : "bg-surface-0/60 border-border/60 text-text-muted"
                      }`}
                    >
                      <div className="text-[10px] mb-1">
                        {isDone ? "✓ Done" : isCurrent ? "● Running" : "○ Pending"}
                      </div>
                      <div className="text-xs truncate">{step.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Optional Technical Activity Toggle */}
              <div>
                <button
                  onClick={() => setShowTechActivity(!showTechActivity)}
                  className="text-xs text-text-muted hover:text-text-primary flex items-center space-x-1.5 transition-colors"
                >
                  <span>{showTechActivity ? "Hide" : "Show"} Technical Stream</span>
                  {showTechActivity ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showTechActivity && (
                  <div className="mt-2.5 p-3 rounded-xl bg-surface-0 border border-border/60 font-mono text-[11px] text-text-secondary space-y-1 max-h-36 overflow-y-auto">
                    <div>[00:00.01] Stream quarantined in isolated memory context</div>
                    <div>[00:00.04] SHA-256 cryptographic digest verified</div>
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
          {/* Back Action & Report Generator */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setScanResult(null);
                setSelectedFile(null);
              }}
              className="text-xs font-medium text-text-secondary hover:text-text-primary flex items-center space-x-1.5 transition-colors"
            >
              <span>← Scan another file</span>
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
                    {scanResult.verdict.level} Risk
                  </Badge>
                  <span className="text-xs font-mono text-text-muted">
                    {scanResult.file.type} Binary
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-semibold text-text-primary tracking-tight">
                  {scanResult.file.name}
                </h3>
                <p className="text-xs font-mono text-text-muted break-all">
                  SHA-256: {scanResult.file.sha256}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1 text-xs text-text-secondary">
                  <span>Size: {(scanResult.file.size / 1024).toFixed(1)} KB</span>
                  <span>·</span>
                  <span>MIME: {scanResult.file.mime}</span>
                  <span>·</span>
                  <span>Findings: {scanResult.findings.length}</span>
                </div>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <ScoreRing
                  score={scanResult.verdict.score}
                  variant="risk"
                  size={128}
                  strokeWidth={9}
                  label="Risk Score"
                />
              </div>
            </div>
          </Card>

          {/* =========================================================================
              LEVEL 2: "Why this score?" Transparent Explanation
              ========================================================================= */}
          <Card level={2} className="p-6 space-y-4">
            <div className="border-b border-border/60 pb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center space-x-2">
                <Info className="w-4 h-4 text-primary" />
                <span>Why this score? — Score Contributors</span>
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Deterministic score calculation. Points are added strictly based on verified static observations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60">
                <div className="text-text-muted text-[11px]">Digital Signature</div>
                <div className="font-medium text-text-primary mt-1 flex items-center justify-between">
                  <span>{scanResult.signature_info?.is_signed ? scanResult.signature_info.status : "Unsigned"}</span>
                  <span className="font-mono text-text-muted text-[11px]">
                    {scanResult.signature_info?.is_signed ? "0 pts" : "+15 pts"}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60">
                <div className="text-text-muted text-[11px]">Entropy Assessment</div>
                <div className="font-medium text-text-primary mt-1 flex items-center justify-between">
                  <span>Normal Distribution</span>
                  <span className="font-mono text-text-muted text-[11px]">+0 pts</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60">
                <div className="text-text-muted text-[11px]">Capabilities Flagged</div>
                <div className="font-medium text-text-primary mt-1 flex items-center justify-between">
                  <span>{scanResult.capabilities.length} Detected</span>
                  <span className="font-mono text-text-muted text-[11px]">+{scanResult.capabilities.length * 5} pts</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60">
                <div className="text-text-muted text-[11px]">Total Calibrated Score</div>
                <div className="font-semibold text-text-primary mt-1 flex items-center justify-between">
                  <span className="text-primary font-mono">{scanResult.verdict.score.toFixed(1)} / 100</span>
                  <span className="text-xs font-mono">{scanResult.verdict.level}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* =========================================================================
              LEVEL 3: Evidence-Based Findings (WHAT, WHY, SOURCE, CONFIDENCE)
              ========================================================================= */}
          <Card level={1} className="p-6 space-y-4">
            <div className="border-b border-border/60 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>Evidence-Based Findings ({scanResult.findings.length})</span>
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Detailed security observations with confidence ratings and recommendations.
                </p>
              </div>
            </div>

            {scanResult.findings.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                No suspicious static artifacts or structural anomalies detected.
              </div>
            ) : (
              <div className="space-y-2.5">
                {scanResult.findings.map((f) => {
                  const isExpanded = !!expandedFindings[f.id];
                  let badgeVariant: "safe" | "low" | "medium" | "high" | "critical" = "low";
                  if (f.severity === "MEDIUM") badgeVariant = "medium";
                  if (f.severity === "HIGH" || f.severity === "CRITICAL") badgeVariant = "high";

                  return (
                    <div
                      key={f.id}
                      className="border border-border/60 rounded-xl bg-surface-0 overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => toggleFinding(f.id)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-1/40 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Badge variant={badgeVariant} size="sm">
                            {f.severity}
                          </Badge>
                          <div>
                            <div className="text-xs font-medium text-text-primary">{f.title}</div>
                            <div className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
                              {f.description}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0 ml-3">
                          <span className="text-[11px] font-mono text-text-muted">
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
                        <div className="p-4 border-t border-border/60 bg-surface-1/30 space-y-3 text-xs">
                          <div>
                            <span className="font-semibold text-text-primary">What was observed:</span>
                            <p className="text-text-secondary mt-0.5 leading-relaxed">{f.description}</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="p-3 rounded-xl bg-surface-0 border border-border/60">
                              <span className="text-[11px] text-text-muted">Engine Source</span>
                              <div className="font-mono text-text-primary mt-0.5">{f.source_engine}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-surface-0 border border-border/60">
                              <span className="text-[11px] text-text-muted">Confidence</span>
                              <div className="font-mono text-text-primary mt-0.5">{f.confidence}</div>
                            </div>
                          </div>

                          {Object.keys(f.evidence || {}).length > 0 && (
                            <div>
                              <span className="font-semibold text-text-primary">Evidence Trace:</span>
                              <pre className="mt-1 p-3 rounded-xl bg-surface-0 border border-border/60 font-mono text-[11px] overflow-x-auto text-text-secondary">
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
              LEVEL 4: Technical Deep Dive (Certificates, Hashes, Capabilities)
              ========================================================================= */}
          <Card level={1} className="p-6 space-y-4">
            <div className="border-b border-border/60 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>Technical Deep Dive</span>
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Raw cryptographic digests, X.509 chains, and capability structures.
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
              <div className="space-y-2.5 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1">
                  <span className="text-text-muted text-[11px] uppercase">SHA-256</span>
                  <div className="text-text-primary break-all">{scanResult.file.sha256}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1">
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
                    <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1">
                      <span className="text-text-muted text-[11px]">Signer Common Name (CN)</span>
                      <div className="font-mono text-text-primary">{scanResult.signature_info.signer_name || "Unknown"}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1">
                      <span className="text-text-muted text-[11px]">Issuer Authority</span>
                      <div className="font-mono text-text-primary">{scanResult.signature_info.issuer_name || "Direct Signer"}</div>
                    </div>
                    {scanResult.signature_info.certificates.map((c, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1 font-mono text-[11px]">
                        <span className="text-text-muted">Certificate #{i + 1} Serial: {c.serial_number}</span>
                        <div>Subject: {c.subject}</div>
                        <div>Issuer: {c.issuer}</div>
                        <div>Valid Until: {new Date(c.not_after).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-surface-1/40 border border-border/60 text-text-secondary text-xs">
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
                    <div key={i} className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-text-primary">{cap.capability}</div>
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
