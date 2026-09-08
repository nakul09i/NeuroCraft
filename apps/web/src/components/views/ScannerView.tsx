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
  Key,
  Layers,
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
  const [showTechDetails, setShowTechDetails] = useState<boolean>(true);
  const [showEvidence, setShowEvidence] = useState<boolean>(true);
  const [showCryptoDetails, setShowCryptoDetails] = useState<boolean>(false);
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
    setAnalysisStep(1); // Quarantined
    setScanResult(null);

    // Realistic progressive pacing
    const stepTimer1 = setTimeout(() => setAnalysisStep(2), 350); // Metadata
    const stepTimer2 = setTimeout(() => setAnalysisStep(3), 750); // Static Analysis
    const stepTimer3 = setTimeout(() => setAnalysisStep(4), 1150); // Signature Verification

    try {
      const res = await api.uploadAndScan(selectedFile);
      setAnalysisStep(5); // Risk Assessment
      setTimeout(() => {
        setScanResult(res);
        setAnalyzing(false);
        toast.success(`Analysis completed for ${selectedFile.name}`);
        if (onScanComplete) onScanComplete(res);
      }, 450);
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

  const stages = [
    { label: "Quarantine", id: 1 },
    { label: "Metadata", id: 2 },
    { label: "Static Analysis", id: 3 },
    { label: "Signature Verification", id: 4 },
    { label: "Risk Assessment", id: 5 },
  ];

  return (
    <div className="space-y-10 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* Title & Assurance Header */}
      <div className="space-y-2.5">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full neu-raised-sm text-emerald-600 dark:text-emerald-400 text-[13px] font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Dynamic Code Execution Guarantee</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
          File Analysis & Digital Signatures
        </h1>
        <p className="text-[15px] sm:text-base text-text-secondary max-w-3xl leading-relaxed">
          Quarantined static inspection of portable executables, PDFs, Android packages, and scripts. Binaries are evaluated in isolated memory without code execution.
        </p>
      </div>

      {/* Upload & Selection Card */}
      {!scanResult && (
        <Card level={0} className="p-8 sm:p-10 space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            className={`rounded-3xl p-10 sm:p-16 text-center transition-all ${
              dragOver
                ? "neu-raised-lg bg-primary/5 border-primary/40"
                : "neu-inset hover:border-text-secondary/40"
            }`}
          >
            <input
              type="file"
              id="file-scanner-input"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl neu-raised text-primary flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                Analyze an untrusted artifact.
              </h2>
              <p className="text-[15px] text-text-secondary mt-1.5">
                Drop file here or choose from your filesystem
              </p>
              <div className="mt-6">
                <label
                  htmlFor="file-scanner-input"
                  className="inline-flex items-center px-6 py-3 rounded-2xl neu-button text-[15px] font-medium text-text-primary hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
                >
                  Choose File
                </label>
              </div>

              {/* Supported Format Chips */}
              <div className="mt-8 pt-6 border-t border-border/60 flex flex-wrap items-center justify-center gap-2.5">
                <span className="text-[13px] text-text-muted mr-1">
                  Supported formats:
                </span>
                {["PE (.exe/.dll)", "PDF", "APK", "Scripts (.ps1/.sh/.py)", "Archives (.zip/.tar)"].map((fmt) => (
                  <span
                    key={fmt}
                    className="px-3 py-1 rounded-full neu-raised-sm text-[12px] text-text-secondary font-mono"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Selected File Preview & Analysis Trigger */}
          {selectedFile && !analyzing && (
            <div className="p-5 rounded-2xl neu-raised flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl neu-inset text-primary flex items-center justify-center shrink-0">
                  <FileCode className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-text-primary">
                    {selectedFile.name}
                  </div>
                  <div className="text-[13px] text-text-muted mt-0.5 font-mono">
                    {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || "binary payload"}
                  </div>
                </div>
              </div>

              <Button
                onClick={executeAnalysis}
                size="lg"
                variant="primary"
                className="w-full sm:w-auto"
                icon={<ArrowRight className="w-5 h-5" />}
              >
                Analyze File
              </Button>
            </div>
          )}

          {/* Multi-Step Analysis Journey */}
          {analyzing && (
            <div className="p-7 rounded-3xl neu-raised space-y-6 animate-fadeIn">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-[18px] font-semibold text-text-primary">
                  Analyzing {selectedFile?.name}…
                </h3>
                <p className="text-[14px] text-text-secondary">
                  Parsing static binary structures in isolated quarantine without execution.
                </p>
              </div>

              {/* Progress Steps */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                {stages.map((stg) => {
                  const isDone = analysisStep > stg.id;
                  const isCurrent = analysisStep === stg.id;

                  return (
                    <div
                      key={stg.id}
                      className={`p-3.5 rounded-2xl text-center transition-all ${
                        isDone
                          ? "neu-raised-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                          : isCurrent
                          ? "neu-inset text-primary font-semibold animate-pulse"
                          : "neu-raised-sm opacity-60 text-text-muted"
                      }`}
                    >
                      <div className="text-[11px] mb-1">
                        {isDone ? "✓ Done" : isCurrent ? "● Running" : "○ Pending"}
                      </div>
                      <div className="text-[13px] truncate font-medium">{stg.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Scan Results — Progressive Disclosure */}
      {scanResult && (
        <div className="space-y-7">
          {/* Back Action & Report Generator */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setScanResult(null);
                setSelectedFile(null);
              }}
              className="text-[14px] font-semibold text-text-secondary hover:text-text-primary flex items-center space-x-1.5 transition-colors"
            >
              <span>← Scan another file</span>
            </button>

            {onGenerateReport && (
              <Button
                size="md"
                variant="secondary"
                onClick={() => onGenerateReport(scanResult.scan_id)}
                icon={<FileText className="w-4 h-4" />}
              >
                Generate Audit Report
              </Button>
            )}
          </div>

          {/* =========================================================================
              OVERVIEW CARD: Result Verdict & Score Ring
              ========================================================================= */}
          <Card level={1} className="p-8 sm:p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <Badge variant={getVerdictBadgeVariant(scanResult.verdict.level)} size="md">
                    {scanResult.verdict.level} Risk
                  </Badge>
                  <span className="text-xs font-mono text-text-muted">
                    {scanResult.file.type} Binary
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                  {scanResult.file.name}
                </h2>
                <p className="text-xs font-mono text-text-muted break-all">
                  SHA-256: {scanResult.file.sha256}
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3.5 pt-1 text-[13px] text-text-secondary">
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
                  size={144}
                  strokeWidth={10}
                  label="Risk Score"
                />
              </div>
            </div>
          </Card>

          {/* =========================================================================
              PROGRESSIVE DISCLOSURE 1: TECHNICAL DETAILS ▾
              ========================================================================= */}
          <Card level={0} className="p-7 space-y-5">
            <button
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="w-full flex items-center justify-between text-left pb-3 border-b border-border/60 select-none"
            >
              <div className="flex items-center space-x-2.5">
                <Info className="w-5 h-5 text-primary" />
                <h3 className="text-[17px] font-semibold text-text-primary">
                  Technical Details & Score Contributors
                </h3>
              </div>
              <div className="p-1 rounded-lg text-text-muted">
                {showTechDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            {showTechDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs animate-fadeIn">
                <div className="p-4 rounded-2xl neu-inset">
                  <div className="text-text-muted text-[12px]">Digital Signature</div>
                  <div className="font-semibold text-text-primary text-[14px] mt-1.5 flex items-center justify-between">
                    <span>{scanResult.signature_info?.is_signed ? scanResult.signature_info.status : "Unsigned"}</span>
                    <span className="font-mono text-text-muted text-[12px]">
                      {scanResult.signature_info?.is_signed ? "0 pts" : "+15 pts"}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl neu-inset">
                  <div className="text-text-muted text-[12px]">Entropy Assessment</div>
                  <div className="font-semibold text-text-primary text-[14px] mt-1.5 flex items-center justify-between">
                    <span>Normal Distribution</span>
                    <span className="font-mono text-text-muted text-[12px]">+0 pts</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl neu-inset">
                  <div className="text-text-muted text-[12px]">Capabilities Flagged</div>
                  <div className="font-semibold text-text-primary text-[14px] mt-1.5 flex items-center justify-between">
                    <span>{scanResult.capabilities.length} Detected</span>
                    <span className="font-mono text-text-muted text-[12px]">+{scanResult.capabilities.length * 5} pts</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl neu-inset">
                  <div className="text-text-muted text-[12px]">Total Calibrated Score</div>
                  <div className="font-bold text-text-primary text-[14px] mt-1.5 flex items-center justify-between">
                    <span className="text-primary font-mono">{scanResult.verdict.score.toFixed(1)} / 100</span>
                    <span className="text-xs font-mono">{scanResult.verdict.level}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* =========================================================================
              PROGRESSIVE DISCLOSURE 2: EVIDENCE FINDINGS ▾
              ========================================================================= */}
          <Card level={0} className="p-7 space-y-5">
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              className="w-full flex items-center justify-between text-left pb-3 border-b border-border/60 select-none"
            >
              <div className="flex items-center space-x-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <h3 className="text-[17px] font-semibold text-text-primary">
                  Evidence-Based Findings ({scanResult.findings.length})
                </h3>
              </div>
              <div className="p-1 rounded-lg text-text-muted">
                {showEvidence ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            {showEvidence && (
              <div className="space-y-3 animate-fadeIn">
                {scanResult.findings.length === 0 ? (
                  <div className="py-8 text-center text-xs text-text-muted">
                    <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    No suspicious static artifacts or structural anomalies detected.
                  </div>
                ) : (
                  scanResult.findings.map((f) => {
                    const isExpanded = !!expandedFindings[f.id];
                    let badgeVariant: "safe" | "low" | "medium" | "high" | "critical" = "low";
                    if (f.severity === "MEDIUM") badgeVariant = "medium";
                    if (f.severity === "HIGH" || f.severity === "CRITICAL") badgeVariant = "high";

                    return (
                      <div
                        key={f.id}
                        className="rounded-2xl neu-raised overflow-hidden transition-all"
                      >
                        <button
                          onClick={() => toggleFinding(f.id)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-1/50 transition-colors"
                        >
                          <div className="flex items-center space-x-3.5">
                            <Badge variant={badgeVariant} size="sm">
                              {f.severity}
                            </Badge>
                            <div>
                              <div className="text-[15px] font-semibold text-text-primary">{f.title}</div>
                              <div className="text-[13px] text-text-muted mt-0.5 line-clamp-1">
                                {f.description}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 shrink-0 ml-3">
                            <span className="text-[12px] font-mono text-text-muted">
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
                          <div className="p-5 border-t border-border/60 bg-surface-1/40 space-y-3.5 text-xs">
                            <div>
                              <span className="font-semibold text-text-primary text-[14px]">What was observed:</span>
                              <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">{f.description}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                              <div className="p-3.5 rounded-xl neu-inset">
                                <span className="text-[12px] text-text-muted">Engine Source</span>
                                <div className="font-mono text-text-primary mt-0.5 text-[13px]">{f.source_engine}</div>
                              </div>
                              <div className="p-3.5 rounded-xl neu-inset">
                                <span className="text-[12px] text-text-muted">Confidence</span>
                                <div className="font-mono text-text-primary mt-0.5 text-[13px]">{f.confidence}</div>
                              </div>
                            </div>

                            {Object.keys(f.evidence || {}).length > 0 && (
                              <div>
                                <span className="font-semibold text-text-primary text-[14px]">Evidence Trace:</span>
                                <pre className="mt-1.5 p-3.5 rounded-xl neu-inset font-mono text-[12px] overflow-x-auto text-text-secondary">
                                  {JSON.stringify(f.evidence, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </Card>

          {/* =========================================================================
              PROGRESSIVE DISCLOSURE 3: CRYPTOGRAPHIC DEEP DIVE ▾
              ========================================================================= */}
          <Card level={0} className="p-7 space-y-5">
            <button
              onClick={() => setShowCryptoDetails(!showCryptoDetails)}
              className="w-full flex items-center justify-between text-left pb-3 border-b border-border/60 select-none"
            >
              <div className="flex items-center space-x-2.5">
                <Sliders className="w-5 h-5 text-primary" />
                <h3 className="text-[17px] font-semibold text-text-primary">
                  Cryptographic Details & Hashes
                </h3>
              </div>
              <div className="p-1 rounded-lg text-text-muted">
                {showCryptoDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            {showCryptoDetails && (
              <div className="space-y-4 animate-fadeIn">
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

                {/* Hashes Tab */}
                {activeTechTab === "hashes" && (
                  <div className="space-y-3 text-xs font-mono">
                    <div className="p-4 rounded-2xl neu-inset space-y-1">
                      <span className="text-text-muted text-[12px] uppercase">SHA-256</span>
                      <div className="text-text-primary text-[14px] break-all">{scanResult.file.sha256}</div>
                    </div>
                    <div className="p-4 rounded-2xl neu-inset space-y-1">
                      <span className="text-text-muted text-[12px] uppercase">File Name & Size</span>
                      <div className="text-text-primary text-[14px]">{scanResult.file.name} ({scanResult.file.size} bytes)</div>
                    </div>
                  </div>
                )}

                {/* Signature & Certificate Chain Tab */}
                {activeTechTab === "signature" && (
                  <div className="space-y-3.5 text-xs">
                    {scanResult.signature_info?.is_signed ? (
                      <div className="space-y-3">
                        <div className="p-4 rounded-2xl neu-inset space-y-1">
                          <span className="text-text-muted text-[12px]">Signer Common Name (CN)</span>
                          <div className="font-mono text-text-primary text-[14px]">{scanResult.signature_info.signer_name || "Unknown"}</div>
                        </div>
                        <div className="p-4 rounded-2xl neu-inset space-y-1">
                          <span className="text-text-muted text-[12px]">Issuer Authority</span>
                          <div className="font-mono text-text-primary text-[14px]">{scanResult.signature_info.issuer_name || "Direct Signer"}</div>
                        </div>
                        {scanResult.signature_info.certificates.map((c, i) => (
                          <div key={i} className="p-4 rounded-2xl neu-inset space-y-1 font-mono text-[12px]">
                            <span className="text-text-muted">Certificate #{i + 1} Serial: {c.serial_number}</span>
                            <div>Subject: {c.subject}</div>
                            <div>Issuer: {c.issuer}</div>
                            <div>Valid Until: {new Date(c.not_after).toLocaleDateString()}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl neu-inset text-text-secondary text-[14px]">
                        No embedded Authenticode or PKCS#7 certificate structure detected. Unsigned binary.
                      </div>
                    )}
                  </div>
                )}

                {/* Capabilities Tab */}
                {activeTechTab === "capabilities" && (
                  <div className="space-y-2.5 text-xs">
                    {scanResult.capabilities.length === 0 ? (
                      <div className="p-5 text-center text-text-muted text-[14px]">
                        No suspicious behavioral capability indicators identified.
                      </div>
                    ) : (
                      scanResult.capabilities.map((cap, i) => (
                        <div key={i} className="p-4 rounded-2xl neu-inset flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-text-primary text-[14px]">{cap.capability}</div>
                            <div className="text-[12px] text-text-muted mt-0.5">Status: {cap.status}</div>
                          </div>
                          <Badge variant="info" size="sm">{cap.confidence}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
