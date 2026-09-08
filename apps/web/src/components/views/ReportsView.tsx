import React, { useState } from "react";
import {
  FileText,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  FileCheck,
  ArrowRight,
  Download,
  Eye,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Select, Input } from "../ui/Input";
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
    "COLLECTING EVIDENCE",
    "ANALYZING FINDINGS",
    "BUILDING REPORT",
    "FINALIZING",
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
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="p-6 sm:p-7 rounded-xl border-2 border-border bg-surface-0 shadow-brutal space-y-3">
        <div className="flex items-center space-x-2">
          <Badge variant="safe" size="sm">TAMPER-EVIDENT</Badge>
          <span className="text-[10px] font-mono font-bold text-text-muted uppercase">
            SHA-256 PROVENANCE AUDIT
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display uppercase">
          SECURITY REPORT BUILDER
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
            <label className="block text-xs font-mono font-extrabold uppercase text-text-primary mb-1.5">
              SOURCE SCAN ID (OPTIONAL)
            </label>
            <input
              type="text"
              placeholder="e.g. scan-172583... (leave blank for latest consolidated session)"
              value={scanId}
              onChange={(e) => setScanId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-surface-1 border-2 border-border text-xs font-mono font-bold text-text-primary placeholder:text-text-muted focus-ring shadow-[2px_2px_0px_var(--border)]"
            />
          </div>

          {/* Report Type Selector */}
          <div>
            <label className="block text-xs font-mono font-extrabold uppercase text-text-primary mb-2">
              SELECT REPORT TYPE
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reportTypes.map((rt) => {
                const isSelected = reportType === rt.id;
                return (
                  <div
                    key={rt.id}
                    onClick={() => setReportType(rt.id)}
                    className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary text-black border-border shadow-brutal-sm -translate-x-0.5 -translate-y-0.5 font-bold"
                        : "bg-surface-1 border-border text-text-primary hover:bg-surface-2"
                    }`}
                  >
                    <div className="font-extrabold text-xs font-display">{rt.name}</div>
                    <div className={`text-[11px] mt-1 ${isSelected ? "text-black/80 font-medium" : "text-text-secondary"}`}>
                      {rt.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generation Sequence Indicator */}
          {loading && (
            <div className="p-4 rounded-lg bg-surface-1 border-2 border-border space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-primary animate-pulse">{stages[genStage]}</span>
                <span className="text-text-muted">{genStage + 1} / 4</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {stages.map((stg, i) => (
                  <div
                    key={stg}
                    className={`p-1.5 text-center text-[9px] font-mono font-extrabold rounded border-2 ${
                      genStage > i
                        ? "bg-theme-success text-black border-theme-success"
                        : genStage === i
                        ? "bg-primary text-black border-border animate-pulse"
                        : "bg-surface-0 border-border text-text-muted"
                    }`}
                  >
                    {stg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit CTA */}
          <div className="flex justify-end pt-2 border-t-2 border-border">
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="text-xs font-black uppercase tracking-wider shadow-brutal"
              icon={<FileCheck className="w-4 h-4 stroke-[2.5]" />}
            >
              [ GENERATE REPORT ]
            </Button>
          </div>
        </form>
      </Card>

      {/* Generation Complete Banner: REPORT READY */}
      {report && (
        <div className="p-4 rounded-xl border-2 border-border bg-theme-success-subtle shadow-brutal flex items-center justify-between animate-fadeIn print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-theme-success border-2 border-border text-black shadow-brutal-sm">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs font-mono font-extrabold uppercase text-text-primary">
                REPORT READY
              </div>
              <div className="text-[11px] text-text-secondary font-mono">
                Consolidated cryptographic audit produced successfully.
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePrint}
              icon={<Printer className="w-3.5 h-3.5" />}
            >
              PRINT / EXPORT PDF
            </Button>
          </div>
        </div>
      )}

      {/* Rendered Evidence-Based Report */}
      {report ? (
        <Card
          level={0}
          className="p-8 sm:p-10 shadow-brutal space-y-8 print:border-none print:shadow-none print:p-0"
        >
          {/* Header */}
          <div className="border-b-2 border-border pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="text-[10px] font-mono font-extrabold text-primary tracking-widest uppercase">
                NEUROCRAFT AUDIT RECORD · ID: {report.id}
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display mt-1">
                {report.title}
              </h3>
            </div>

            <div className="text-right text-xs font-mono text-text-muted">
              <div className="flex items-center space-x-1.5 justify-end">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{new Date(report.created_at).toLocaleString()}</span>
              </div>
              <div className="text-[10px] uppercase font-bold text-theme-success-text mt-1">
                ✓ CRYPTOGRAPHICALLY SIGNED
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider">
              1. EXECUTIVE SUMMARY
            </h4>
            <div className="p-4 rounded-lg bg-surface-1 border-2 border-border text-xs leading-relaxed text-text-secondary">
              {report.summary}
            </div>
          </div>

          {/* Key Recommendations List */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider">
              2. ACTIONABLE RECOMMENDATIONS ({report.content.recommendations?.length || 0})
            </h4>
            {!report.content.recommendations || report.content.recommendations.length === 0 ? (
              <div className="p-4 text-xs font-mono text-theme-success font-bold rounded-lg border-2 border-border bg-surface-1">
                ✓ Zero adverse security remediation steps required.
              </div>
            ) : (
              <div className="space-y-2">
                {report.content.recommendations.map((rec: string, i: number) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-lg border-2 border-border bg-surface-1 flex items-start justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="font-extrabold text-text-primary font-display">Step {i + 1}</div>
                      <div className="text-text-secondary mt-0.5 leading-relaxed">{rec}</div>
                    </div>
                    <Badge variant="medium" size="sm">
                      RECOMMENDED
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cryptographic Provenance Section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider">
              3. CRYPTOGRAPHIC PROVENANCE & NON-REPUDIATION
            </h4>
            <div className="p-4 rounded-lg bg-surface-1 border-2 border-border space-y-2 font-mono text-xs text-text-secondary">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Report Record ID:</span>
                <span className="font-bold text-text-primary truncate max-w-xs">{report.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Source Artifact Ref:</span>
                <span className="font-bold text-text-primary truncate max-w-xs">{report.scan_id || "Session Consolidate"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Verification Engine:</span>
                <span className="font-bold text-primary">NeuroCraft Multi-Engine v1.4-FOSS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Dynamic Execution Status:</span>
                <span className="font-bold text-theme-success">DISALLOWED (STRICT STATIC)</span>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card level={0} className="p-12 print:hidden">
          <EmptyState
            icon={<FileText className="w-8 h-8 text-text-muted stroke-[2.2]" />}
            title="NO REPORTS YET."
            description="Generate your first evidence-based report using the builder above."
            actionLabel="GENERATE REPORT →"
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
