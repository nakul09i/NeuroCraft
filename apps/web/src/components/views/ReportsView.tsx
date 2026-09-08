import React, { useState } from "react";
import {
  FileText,
  Printer,
  Calendar,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api";
import { ReportResponse } from "../../types";

export interface ReportsViewProps {
  initialScanId?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ initialScanId }) => {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>("EXECUTIVE_SUMMARY");
  const [scanId, setScanId] = useState<string>(initialScanId || "");
  const [loading, setLoading] = useState(false);
  const [genStage, setGenStage] = useState<number>(0);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reportTypes = [
    {
      id: "EXECUTIVE_SUMMARY",
      name: "Executive Summary",
      desc: "High-level risk posture and critical findings tailored for leadership and stakeholders",
    },
    {
      id: "TECHNICAL_DEEP_DIVE",
      name: "Technical Deep Dive",
      desc: "Detailed entropy distribution, suspicious PE section analysis, and binary capabilities",
    },
    {
      id: "CRYPTOGRAPHIC_ANALYSIS",
      name: "Cryptographic Analysis",
      desc: "Authenticode signatures, X.509 certificate chain validation, and EPR channel telemetry",
    },
    {
      id: "FULL_SECURITY_AUDIT",
      name: "Full Security Audit",
      desc: "Consolidated multi-engine assessment with comprehensive non-repudiation audit logs",
    },
  ];

  const stages = [
    "Collecting Evidence",
    "Analyzing Findings",
    "Building Report",
    "Finalizing",
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setGenStage(0);
    setErrorMsg(null);

    const timer1 = setTimeout(() => setGenStage(1), 300);
    const timer2 = setTimeout(() => setGenStage(2), 650);
    const timer3 = setTimeout(() => setGenStage(3), 1000);

    try {
      const res = await api.generateReport(
        reportType,
        scanId.trim() || undefined,
        undefined,
        undefined
      );
      setTimeout(() => {
        setReport(res);
        setLoading(false);
        setGenStage(0);
        toast.success("Security report generated successfully.");
      }, 1300);
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setLoading(false);
      setGenStage(0);
      const message = typeof err?.message === "string" ? err.message : "Failed to synthesize security report";
      setErrorMsg(message);
      toast.error(message, "Report Generation Error");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Safe recommendation extractor that never prints [object Object]
  const renderRecommendationText = (rec: any): string => {
    if (typeof rec === "string") return rec;
    if (!rec) return "";
    if (typeof rec === "object") {
      return rec.description || rec.title || rec.text || rec.detail || JSON.stringify(rec);
    }
    return String(rec);
  };

  const recommendations = Array.isArray(report?.content?.recommendations)
    ? report!.content.recommendations
    : [];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-14">
      {/* Soft Neumorphic Hero Header Banner */}
      <Card surface="raised" className="p-8 sm:p-10 relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex items-center space-x-3 mb-3">
          <Badge variant="safe" size="sm">Tamper-Evident</Badge>
          <span className="text-sm font-mono text-text-muted">
            SHA-256 Provenance Audit Record
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
          Security Report Builder
        </h1>
        <p className="text-base text-text-secondary mt-2 max-w-3xl leading-relaxed">
          Synthesize static quarantine findings, Authenticode signature certificates, passive exposure vectors, and quantum trust simulations into an executive or technical audit report.
        </p>
      </Card>

      {/* Report Builder Configuration Card */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-6 print:hidden">
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Source Scan Input */}
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">
              Source Scan ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. scan-172583… (leave blank to synthesize latest session)"
              value={scanId}
              onChange={(e) => setScanId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl neu-inset bg-surface-0/60 text-sm font-mono text-text-primary placeholder:text-text-muted focus-ring"
            />
          </div>

          {/* Report Type Selector */}
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider text-text-muted mb-3">
              Select Report Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reportTypes.map((rt) => {
                const isSelected = reportType === rt.id;
                return (
                  <div
                    key={rt.id}
                    onClick={() => setReportType(rt.id)}
                    className={`p-5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                      isSelected
                        ? "neu-inset border-primary/50 bg-primary/10 text-text-primary shadow-inner"
                        : "neu-button bg-surface-0 border-border/60 text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <div className="font-bold text-base text-text-primary mb-1">{rt.name}</div>
                    <div className="text-xs sm:text-sm text-text-muted leading-relaxed">
                      {rt.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generation Sequence Indicator */}
          {loading && (
            <div className="p-5 rounded-2xl neu-inset-sm bg-surface-0/60 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between text-sm">
                <span className="text-primary font-bold flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>{stages[genStage]}…</span>
                </span>
                <span className="text-text-muted font-mono font-medium">Stage {genStage + 1} of 4</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {stages.map((stg, i) => (
                  <div
                    key={stg}
                    className={`p-3 text-center text-xs rounded-xl border transition-all duration-200 ${
                      genStage > i
                        ? "neu-inset-sm bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                        : genStage === i
                        ? "neu-inset-sm bg-primary/20 text-primary border-primary/40 font-bold"
                        : "neu-button bg-surface-0 border-border/50 text-text-muted"
                    }`}
                  >
                    {stg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Recovery State */}
          {errorMsg && (
            <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <span className="text-sm text-rose-700 dark:text-rose-300 font-medium">
                  {errorMsg}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerate()}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Submit CTA */}
          <div className="flex justify-end pt-3 border-t border-border/60">
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="text-base font-semibold px-6 py-3.5 shadow-md"
              icon={<FileCheck className="w-5 h-5" />}
            >
              Generate Report
            </Button>
          </div>
        </form>
      </Card>

      {/* Generation Complete Banner */}
      {report && (
        <Card
          surface="raised"
          className="p-5 border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn print:hidden"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl neu-inset-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold text-text-primary">
                Security Audit Report Ready
              </div>
              <div className="text-sm text-text-secondary">
                Consolidated cryptographic evidence synthesized with deterministic non-repudiation.
              </div>
            </div>
          </div>

          <Button
            size="md"
            variant="secondary"
            onClick={handlePrint}
            icon={<Printer className="w-4 h-4" />}
            className="neu-button font-medium"
          >
            Print / Export PDF
          </Button>
        </Card>
      )}

      {/* Rendered Evidence-Based Report */}
      {report ? (
        <Card
          surface="raised"
          className="p-8 sm:p-12 space-y-9 print:border-none print:shadow-none print:p-0"
        >
          {/* Header */}
          <div className="border-b border-border/60 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="text-xs text-primary font-mono font-bold tracking-wider uppercase">
                NeuroCraft Audit Record · ID: {report.id}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mt-1.5">
                {report.title}
              </h2>
            </div>

            <div className="text-right text-sm text-text-muted">
              <div className="flex items-center space-x-2 justify-end">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-medium">{new Date(report.created_at).toLocaleString()}</span>
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                ✓ Cryptographically Signed & Quarantined
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
              1. Executive Summary
            </h3>
            <div className="p-5 rounded-2xl neu-inset-sm bg-surface-0/60 text-sm leading-relaxed text-text-secondary">
              {report.summary || "No executive summary provided."}
            </div>
          </div>

          {/* Actionable Recommendations List */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
              2. Actionable Recommendations ({recommendations.length})
            </h3>
            {recommendations.length === 0 ? (
              <div className="p-5 text-sm text-emerald-600 dark:text-emerald-400 font-semibold rounded-2xl neu-inset-sm bg-surface-0/60">
                ✓ Zero adverse security remediation steps required. Binary demonstrates clean provenance.
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec: any, i: number) => {
                  const recText = renderRecommendationText(rec);
                  return (
                    <div
                      key={i}
                      className="p-4 sm:p-5 rounded-2xl border border-border/60 neu-inset-sm bg-surface-0/40 flex items-start justify-between gap-4 text-sm"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-text-primary">Step {i + 1}</div>
                        <div className="text-text-secondary leading-relaxed">{recText}</div>
                      </div>
                      <Badge variant="medium" size="sm">
                        Priority
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cryptographic Provenance Section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
              3. Cryptographic Provenance & Non-Repudiation
            </h3>
            <div className="p-5 rounded-2xl neu-inset bg-surface-0/80 space-y-3 font-mono text-xs sm:text-sm text-text-secondary">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-text-muted">Report Record ID:</span>
                <span className="font-bold text-text-primary break-all">{report.id}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-text-muted">Source Artifact Ref:</span>
                <span className="font-bold text-text-primary break-all">{report.scan_id || "Session Consolidate"}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-text-muted">Verification Engine:</span>
                <span className="font-bold text-primary">NeuroCraft Multi-Engine v1.4-FOSS</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-text-muted">Execution Policy:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Deterministic Static Only</span>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card surface="raised" className="p-14 print:hidden">
          <EmptyState
            icon={<FileText className="w-10 h-10 text-text-muted" />}
            title="No reports synthesized yet"
            description="Generate your first evidence-based security report using the builder template above."
            actionLabel="Synthesize Report"
            onAction={() => handleGenerate()}
          />
        </Card>
      )}
    </div>
  );
};
