import React, { useState, useRef } from "react";
import {
  Upload,
  ShieldCheck,
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
  Lock,
  Unlock,
  Activity,
  AlertTriangle,
  HelpCircle,
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
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Expandable technical details toggle
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Friendly 5-stage progress timeline
  const simpleStages = [
    { id: 1, label: "File received safely", desc: "Stored in a secure temporary space" },
    { id: 2, label: "Checking file structure", desc: "Reading headers and formatting" },
    { id: 3, label: "Looking for unusual patterns", desc: "Checking for hidden or compressed code" },
    { id: 4, label: "Checking file authenticity", desc: "Verifying digital signatures and authors" },
    { id: 5, label: "Preparing results", desc: "Compiling your easy-to-read safety summary" },
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
    toast.info(`Sample file "${name}" loaded.`);
  };

  const executeAnalysis = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setAnalysisStep(1);
    setScanResult(null);

    const timer1 = setTimeout(() => setAnalysisStep(2), 250);
    const timer2 = setTimeout(() => setAnalysisStep(3), 600);
    const timer3 = setTimeout(() => setAnalysisStep(4), 1000);
    const timer4 = setTimeout(() => setAnalysisStep(5), 1400);

    try {
      const res = await api.uploadAndScan(selectedFile);
      setTimeout(() => {
        setScanResult(res);
        setAnalyzing(false);
        setAnalysisStep(0);

        toast.success(`Check completed for ${selectedFile.name}`);
        addNotification(
          "File Check Complete",
          `"${selectedFile.name}" check finished: ${res.verdict.level === "SAFE" ? "Safe to open" : "Needs attention"}`,
          "scanner",
          res.verdict.level === "SAFE" ? "success" : "warning"
        );
        if (onScanComplete) onScanComplete(res);
      }, 1600);
    } catch (err: unknown) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      setAnalyzing(false);
      setAnalysisStep(0);
      const msg = formatApiError(err, "We couldn't check this file right now. Please try again.");
      toast.error(msg, "Check Error");
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    toast.info("File hash copied to clipboard");
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Convert technical finding into simple human language
  const humanizeFinding = (finding: any) => {
    let title = finding.title || "Unusual pattern found";
    let desc = finding.description || "Something in this file is worth reviewing.";

    if (title.toLowerCase().includes("entropy")) {
      title = "Unusual File Pattern";
      desc = "Some parts of this file look compressed or encrypted, which is common in packed applications.";
    } else if (title.toLowerCase().includes("unsigned") || title.toLowerCase().includes("signature")) {
      title = "No Digital Signature";
      desc = "We couldn't verify who officially created or signed this file.";
    } else if (title.toLowerCase().includes("import") || title.toLowerCase().includes("capability")) {
      title = "System Capabilities Found";
      desc = "This file requests permissions to interact with network or system features.";
    }

    return { title, desc };
  };

  // Safety score: 100 is cleanest/safest
  const getSafetyScore = (score: number) => {
    return Math.max(0, Math.min(100, Math.round(100 - score)));
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <Card surface="raised" className="p-8 sm:p-10 relative overflow-hidden border border-border">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex items-center space-x-2.5 mb-3">
          <Badge variant="safe" size="sm">100% Safe Check</Badge>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Files are never opened or run on your device
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
          Check a File
        </h1>
        <p className="text-base text-text-secondary mt-2 max-w-3xl leading-relaxed">
          Upload any file to see if it's authentic, look for unusual patterns, and verify who created it before opening it.
        </p>
      </Card>

      {/* Upload Zone & Form Card */}
      {!scanResult && (
        <Card surface="raised" className="p-7 sm:p-10 space-y-6 border border-border">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInput}
            className="hidden"
          />

          {/* Friendly Dropzone */}
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
                : "bg-surface-1 border-border hover:border-primary/50"
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-0 border border-border text-primary flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Upload className="w-8 h-8 stroke-[2]" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              {selectedFile ? selectedFile.name : "Drop your file here"}
            </h3>

            <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto">
              {selectedFile
                ? `${formatBytes(selectedFile.size)} · Ready to check`
                : "or click to choose a file from your computer"}
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
                className="font-semibold text-sm px-6"
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
                  className="text-sm"
                >
                  Clear
                </Button>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-center gap-3 text-xs text-text-muted">
              <span>Supports: <strong>PDF, ZIP, EXE, APK, Word, scripts (.ps1, .sh, .py)</strong></span>
              <span>·</span>
              <span>Max file size: <strong>25 MB</strong></span>
            </div>
          </div>

          {/* Quick Demo Artifacts */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs font-semibold text-text-muted">
              Try an example file:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  loadSampleFile(
                    "signed_app.exe",
                    "MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00\xb8\x00\x00\x00\x00\x00\x00\x00@\x00\x00\x00DemoSignedApplicationPayload",
                    "application/x-dosexec"
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-surface-1 border border-border hover:bg-surface-2 text-xs font-medium text-text-primary hover:text-primary transition-colors"
              >
                📄 sample_app.exe
              </button>
              <button
                type="button"
                onClick={() =>
                  loadSampleFile(
                    "project_notes.pdf",
                    "%PDF-1.7\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n142\n%%EOF",
                    "application/pdf"
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-surface-1 border border-border hover:bg-surface-2 text-xs font-medium text-text-primary hover:text-primary transition-colors"
              >
                📄 document.pdf
              </button>
              <button
                type="button"
                onClick={() =>
                  loadSampleFile(
                    "setup_script.ps1",
                    "# Setup automation\nWrite-Output 'Checking configuration settings on your computer'\nGet-Service",
                    "text/plain"
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-surface-1 border border-border hover:bg-surface-2 text-xs font-medium text-text-primary hover:text-primary transition-colors"
              >
                📄 setup_script.ps1
              </button>
            </div>
          </div>

          {/* Action Trigger */}
          {selectedFile && !analyzing && (
            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                onClick={executeAnalysis}
                size="lg"
                variant="primary"
                className="text-base font-semibold px-8 py-3.5 shadow-md"
                icon={<ArrowRight className="w-5 h-5" />}
              >
                Check This File
              </Button>
            </div>
          )}

          {/* Friendly Progress Indicator */}
          {analyzing && (
            <div className="p-6 sm:p-8 rounded-2xl bg-surface-1 border border-border space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-text-primary flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-primary animate-spin" />
                    <span>Checking your file...</span>
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Looking for unusual patterns and verifying authenticity
                  </p>
                </div>
                <span className="text-xs font-mono text-primary font-bold">
                  Step {analysisStep} of 5
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${(analysisStep / 5) * 100}%` }}
                />
              </div>

              {/* Simple Step Checklist */}
              <div className="space-y-2 text-xs">
                {simpleStages.map((stg) => {
                  const isDone = analysisStep > stg.id;
                  const isCurrent = analysisStep === stg.id;

                  return (
                    <div
                      key={stg.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isDone
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : isCurrent
                          ? "bg-primary/10 border-primary/40 text-primary font-bold shadow-xs"
                          : "bg-surface-0 border-border/50 text-text-muted opacity-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                          {isDone ? "✓" : isCurrent ? "→" : "○"}
                        </div>
                        <div>
                          <div className="font-semibold">{stg.label}</div>
                          <div className="text-[11px] text-text-muted font-normal">{stg.desc}</div>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold">
                        {isDone ? "Done" : isCurrent ? "Checking..." : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Analysis Results */}
      {scanResult && (
        <div className="space-y-6 animate-fadeIn">
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
              <span>Check Another File</span>
            </button>

            {onGenerateReport && (
              <Button
                size="md"
                variant="primary"
                onClick={() => onGenerateReport(scanResult.scan_id)}
                icon={<FileText className="w-4 h-4" />}
                className="font-semibold text-xs sm:text-sm"
              >
                Create Security Report
              </Button>
            )}
          </div>

          {/* 1. TOP RESULT CARD (Start with the answer) */}
          <Card surface="raised" className="p-7 sm:p-9 space-y-6 border border-border">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center md:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <Badge
                    variant={
                      scanResult.verdict.level === "SAFE"
                        ? "safe"
                        : scanResult.verdict.level === "LOW"
                        ? "low"
                        : scanResult.verdict.level === "MEDIUM"
                        ? "medium"
                        : "high"
                    }
                    size="md"
                  >
                    {scanResult.verdict.level === "SAFE"
                      ? "LOOKS SAFE"
                      : scanResult.verdict.level === "LOW"
                      ? "LOW RISK"
                      : scanResult.verdict.level === "MEDIUM"
                      ? "MEDIUM RISK"
                      : "HIGH RISK"}
                  </Badge>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-surface-1 border border-border text-text-secondary">
                    {scanResult.file.type} File
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                  {scanResult.verdict.level === "SAFE"
                    ? "✓ This file looks safe to open"
                    : scanResult.verdict.level === "LOW"
                    ? "✓ File looks mostly clean with minor notes"
                    : scanResult.verdict.level === "MEDIUM"
                    ? "⚠ This file needs attention"
                    : "🚨 Potential risk detected in this file"}
                </h2>

                <p className="text-sm text-text-secondary leading-relaxed max-w-2xl font-normal">
                  {scanResult.verdict.level === "SAFE"
                    ? "We checked the structure and digital signatures. No malicious patterns or suspicious links were found."
                    : scanResult.verdict.level === "LOW"
                    ? "This file looks standard, but lacks an official digital signature from a verified publisher."
                    : scanResult.verdict.level === "MEDIUM"
                    ? "Some parts of this file look compressed or unsigned. We recommend checking where you got this file before running it."
                    : "This file contains patterns commonly associated with unauthorized modifications or suspicious tools."}
                </p>

                {/* Core Friendly Information Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-surface-1 border border-border">
                    <div className="text-xs text-text-muted">File Name</div>
                    <div className="font-bold text-xs sm:text-sm text-text-primary mt-0.5 truncate" title={scanResult.file.name}>
                      {scanResult.file.name}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-1 border border-border">
                    <div className="text-xs text-text-muted">File Size</div>
                    <div className="font-semibold text-xs sm:text-sm text-text-primary mt-0.5">
                      {formatBytes(scanResult.file.size)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-1 border border-border">
                    <div className="text-xs text-text-muted">Digital Signature</div>
                    <div className="font-semibold text-xs sm:text-sm text-text-primary mt-0.5 truncate">
                      {scanResult.signature_info?.is_signed ? (
                        <span className="text-emerald-600 dark:text-emerald-400">✓ Signed & Verified</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">No Digital Signature</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-1 border border-border">
                    <div className="text-xs text-text-muted flex items-center justify-between">
                      <span>File Hash</span>
                      <span title="A unique digital fingerprint for this file">
                        <HelpCircle className="w-3 h-3 text-text-muted" />
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className="font-mono text-xs text-text-primary truncate" title={scanResult.file.sha256}>
                        {scanResult.file.sha256.substring(0, 10)}…
                      </span>
                      <button
                        onClick={() => copyHash(scanResult.file.sha256)}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-surface-0 border border-border text-text-muted hover:text-text-primary"
                        title="Copy full file hash"
                      >
                        {copiedHash ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Safety Score Radial Gauge */}
              <div className="shrink-0 flex flex-col items-center">
                <ScoreRing
                  score={getSafetyScore(safeNumber(scanResult.verdict.score, 0))}
                  variant="safety"
                  size={140}
                  strokeWidth={10}
                  label="Safety Score"
                />
              </div>
            </div>
          </Card>

          {/* 2. "WHAT WE FOUND" (Human-Readable Findings) */}
          <Card surface="raised" className="p-7 sm:p-8 space-y-4 border border-border">
            <div className="border-b border-border pb-3">
              <h3 className="text-base sm:text-lg font-bold text-text-primary">
                What we found ({scanResult.findings.length})
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Summary of the checks performed on this file.
              </p>
            </div>

            {scanResult.findings.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>Zero issues found. All standard checks passed smoothly.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {scanResult.findings.map((f, idx) => {
                  const human = humanizeFinding(f);
                  const isSafe = f.severity === "INFO" || f.severity === "SAFE";

                  return (
                    <div
                      key={f.id || idx}
                      className="p-4 rounded-xl bg-surface-1 border border-border flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${isSafe ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <h4 className="font-bold text-sm text-text-primary">{human.title}</h4>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed pl-4">
                          {human.desc}
                        </p>
                      </div>

                      <Badge
                        variant={isSafe ? "safe" : f.severity === "LOW" ? "low" : f.severity === "MEDIUM" ? "medium" : "high"}
                        size="sm"
                      >
                        {f.severity}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* 3. "WHAT SHOULD I DO?" (Actionable Advice) */}
          <Card surface="raised" className="p-6 sm:p-7 space-y-2.5 border border-border bg-primary-subtle/30">
            <h3 className="text-sm font-bold text-text-primary flex items-center space-x-2">
              <Info className="w-4 h-4 text-primary" />
              <span>What should I do?</span>
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              {scanResult.verdict.level === "SAFE"
                ? "This file looks safe to open and use normally."
                : "Only open this file if you trust the person or website that provided it to you."}
            </p>
          </Card>

          {/* 4. OPTIONAL TECHNICAL DETAILS DRAWER */}
          <Card surface="raised" className="p-6 space-y-4 border border-border">
            <div
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="flex items-center justify-between cursor-pointer select-none py-1"
            >
              <div className="flex items-center space-x-2.5">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-text-primary">
                  View Technical Details (Optional)
                </h3>
              </div>
              <button className="p-1.5 rounded-lg bg-surface-1 hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors">
                {showTechDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showTechDetails && (
              <div className="space-y-4 pt-2 border-t border-border animate-fadeIn text-xs">
                {/* Technical stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  <div className="p-3.5 rounded-xl bg-surface-1 border border-border">
                    <div className="text-text-muted font-sans text-[11px]">Shannon Entropy Score</div>
                    <div className="text-base font-bold text-text-primary mt-0.5">
                      {typeof scanResult.metadata?.entropy?.shannon === "number"
                        ? scanResult.metadata.entropy.shannon.toFixed(3)
                        : "0.000"} / 8.000
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-1 border border-border">
                    <div className="text-text-muted font-sans text-[11px]">Compressed Sections</div>
                    <div className="text-base font-bold text-text-primary mt-0.5">
                      {scanResult.metadata?.entropy?.suspicious_sections?.length || 0}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-1 border border-border">
                    <div className="text-text-muted font-sans text-[11px]">Digital Certificate Subject</div>
                    <div className="text-xs font-bold text-text-primary mt-0.5 truncate">
                      {scanResult.signature_info?.signer_name || "Unsigned"}
                    </div>
                  </div>
                </div>

                {/* Raw forensic JSON toggle */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center space-x-1"
                  >
                    <span>{showRawJson ? "Hide Raw JSON Metadata" : "Show Raw JSON Metadata"}</span>
                  </button>

                  {showRawJson && (
                    <pre className="mt-2 p-4 rounded-xl bg-surface-1 border border-border text-[11px] font-mono text-text-secondary overflow-x-auto max-h-60">
                      {JSON.stringify(scanResult, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
