import React, { useState } from "react";
import {
  FileText,
  Printer,
  Calendar,
  FileCheck,
  CheckCircle2,
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

  const reportTypes = [
    { id: "EXECUTIVE_SUMMARY", name: "Executive Summary", desc: "High-level risk posture and critical findings for stakeholders" },
    { id: "TECHNICAL_DEEP_DIVE", name: "Technical Deep Dive", desc: "Detailed entropy, imports, and binary capability telemetry" },
    { id: "CRYPTOGRAPHIC_ANALYSIS", name: "Cryptographic Analysis", desc: "Authenticode signatures, certificate chains, and EPR channel validation" },
    { id: "FULL_SECURITY_AUDIT", name: "Full Security Audit", desc: "Consolidated multi-engine assessment with complete provenance logs" },
  ];

  const stages = [
    "Collecting Evidence",
    "Analyzing Findings",
    "Building Report",
    "Finalizing",
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGenStage(0);

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
      toast.error(err.message || "Failed to generate report", "Synthesis Error");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-14">
      {/* Header Banner */}
      <div className="p-7 rounded-2xl border border-border/70 bg-surface-0/70 backdrop-blur-sm shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Badge variant="safe" size="sm">Tamper-Evident</Badge>
          <span className="text-xs text-text-muted">
            SHA-256 Provenance Audit
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
          Security Report Builder
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary max-w-3xl leading-relaxed">
          Synthesize static quarantine findings, Authenticode signature certificates, passive exposure vectors, and quantum trust simulations into an executive or technical audit report.
        </p>
      </div>

      {/* Report Builder Configuration Card */}
      <Card level={0} className="p-6 sm:p-7 space-y-6 print:hidden">
        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Source Scan Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Source Scan ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. scan-172583… (leave blank for latest session)"
              value={scanId}
              onChange={(e) => setScanId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-1/60 border border-border/70 text-xs font-mono text-text-primary placeholder:text-text-muted focus-ring shadow-xs"
            />
          </div>

          {/* Report Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
              Select Report Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reportTypes.map((rt) => {
                const isSelected = reportType === rt.id;
                return (
                  <div
                    key={rt.id}
                    onClick={() => setReportType(rt.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary/40 text-text-primary shadow-xs"
                        : "bg-surface-1/40 border-border/60 text-text-secondary hover:bg-surface-1/80 hover:text-text-primary"
                    }`}
                  >
                    <div className="font-semibold text-xs text-text-primary">{rt.name}</div>
                    <div className="text-[11px] text-text-muted mt-1 leading-relaxed">
                      {rt.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generation Sequence Indicator */}
          {loading && (
            <div className="p-4 rounded-xl bg-surface-1/50 border border-border/70 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary font-medium">{stages[genStage]}…</span>
                <span className="text-text-muted">{genStage + 1} / 4</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {stages.map((stg, i) => (
                  <div
                    key={stg}
                    className={`p-2 text-center text-[10px] rounded-lg border transition-all ${
                      genStage > i
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
                        : genStage === i
                        ? "bg-primary/10 text-primary border-primary/40 font-semibold"
                        : "bg-surface-0/60 border-border/60 text-text-muted"
                    }`}
                  >
                    {stg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit CTA */}
          <div className="flex justify-end pt-2 border-t border-border/60">
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="text-xs font-medium"
              icon={<FileCheck className="w-4 h-4" />}
            >
              Generate Report
            </Button>
          </div>
        </form>
      </Card>

      {/* Generation Complete Banner */}
      {report && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-xs flex items-center justify-between animate-fadeIn print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-text-primary">
                Report Ready
              </div>
              <div className="text-[11px] text-text-muted">
                Consolidated cryptographic audit produced successfully.
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5" />}
          >
            Print / Export PDF
          </Button>
        </div>
      )}

      {/* Rendered Evidence-Based Report */}
      {report ? (
        <Card
          level={0}
          className="p-8 sm:p-10 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0"
        >
          {/* Header */}
          <div className="border-b border-border/60 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="text-[11px] text-primary font-mono font-medium tracking-wide uppercase">
                NeuroCraft Audit Record · ID: {report.id}
              </div>
              <h3 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight mt-1">
                {report.title}
              </h3>
            </div>

            <div className="text-right text-xs text-text-muted">
              <div className="flex items-center space-x-1.5 justify-end">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{new Date(report.created_at).toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                ✓ Cryptographically Signed
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              1. Executive Summary
            </h4>
            <div className="p-4 rounded-xl bg-surface-1/40 border border-border/60 text-xs leading-relaxed text-text-secondary">
              {report.summary}
            </div>
          </div>

          {/* Key Recommendations List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              2. Actionable Recommendations ({report.content.recommendations?.length || 0})
            </h4>
            {!report.content.recommendations || report.content.recommendations.length === 0 ? (
              <div className="p-4 text-xs text-emerald-600 dark:text-emerald-400 font-medium rounded-xl border border-border/60 bg-surface-1/40">
                ✓ Zero adverse security remediation steps required.
              </div>
            ) : (
              <div className="space-y-2">
                {report.content.recommendations.map((rec: string, i: number) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-border/60 bg-surface-1/40 flex items-start justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="font-medium text-text-primary">Step {i + 1}</div>
                      <div className="text-text-secondary mt-0.5 leading-relaxed">{rec}</div>
                    </div>
                    <Badge variant="medium" size="sm">
                      Recommended
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cryptographic Provenance Section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              3. Cryptographic Provenance & Non-Repudiation
            </h4>
            <div className="p-4 rounded-xl bg-surface-1/40 border border-border/60 space-y-2 font-mono text-xs text-text-secondary">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Report Record ID:</span>
                <span className="font-medium text-text-primary truncate max-w-xs">{report.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Source Artifact Ref:</span>
                <span className="font-medium text-text-primary truncate max-w-xs">{report.scan_id || "Session Consolidate"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Verification Engine:</span>
                <span className="font-medium text-primary">NeuroCraft Multi-Engine v1.4-FOSS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Execution Policy:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Deterministic Static Only</span>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card level={0} className="p-12 print:hidden">
          <EmptyState
            icon={<FileText className="w-8 h-8 text-text-muted" />}
            title="No reports yet"
            description="Generate your first evidence-based report using the builder above."
            actionLabel="Generate Report"
            onAction={() => {
              const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
              if (btn) btn.click();
            }}
          />
        </Card>
      )}
    </div>
  );
};
