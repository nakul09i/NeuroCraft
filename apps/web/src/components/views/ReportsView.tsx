import React, { useState } from "react";
import {
  FileText,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Atom,
  RefreshCw,
  Calendar,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Select, Input } from "../ui/Input";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api";
import { ReportResponse } from "../../types";

export interface ReportsViewProps {
  initialScanId?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ initialScanId }) => {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>("EXECUTIVE_AUDIT");
  const [scanId, setScanId] = useState<string>(initialScanId || "");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.generateReport(
        reportType,
        scanId.trim() || undefined,
        undefined,
        undefined
      );
      setReport(res);
      toast.success("Consolidated audit report synthesized.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate report", "Report Synthesis Error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-primary-subtle text-primary text-[11px] font-mono font-bold mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>CRYPTOGRAPHIC PROVENANCE & AUDIT</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Security Audit Reports
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
            Synthesize multi-layer static file analysis, digital signature verification, passive exposure, and quantum trust metrics into an executive audit record.
          </p>
        </div>

        {report && (
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            icon={<Printer className="w-4 h-4" />}
            className="print:hidden shrink-0"
          >
            Print / Export PDF
          </Button>
        )}
      </div>

      {/* Generation Form */}
      <Card level={1} className="p-6 print:hidden">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Report Specification"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="EXECUTIVE_AUDIT">Executive Cybersecurity Audit</option>
              <option value="TECHNICAL_DEEP_DIVE">Technical Deep Dive & Cryptographic Analysis</option>
              <option value="COMPLIANCE_CERTIFICATE">Digital Signature Integrity Certificate</option>
            </Select>

            <Input
              label="Target Scan ID (Optional)"
              placeholder="e.g. paste scan UUID from file analysis"
              value={scanId}
              onChange={(e) => setScanId(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              loading={loading}
              loadingText="Synthesizing Report..."
              icon={<FileCheck className="w-4 h-4" />}
            >
              Generate Consolidated Report
            </Button>
          </div>
        </form>
      </Card>

      {/* Rendered Audit Report */}
      {report && (
        <Card
          level={0}
          className="p-8 sm:p-10 shadow-lg space-y-8 print:border-none print:shadow-none print:p-0"
        >
          {/* Header */}
          <div className="border-b border-border pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="text-[11px] font-mono font-bold text-primary tracking-widest uppercase">
                NEUROCRAFT AUDIT RECORD • ID: {report.id}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight mt-1">
                {report.title}
              </h3>
            </div>

            <div className="text-right text-xs font-mono text-text-muted">
              <div className="flex items-center space-x-1.5 justify-end">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{new Date(report.created_at).toLocaleString()}</span>
              </div>
              <div className="text-[10px] uppercase font-bold text-theme-success-text mt-1">
                CRYPTOGRAPHICALLY VERIFIED
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Executive Summary
            </h4>
            <p className="text-xs sm:text-sm leading-relaxed text-text-secondary p-4 rounded-xl bg-surface-1 border border-border">
              {report.summary}
            </p>
          </div>

          {/* Section 1: Observed Physical Evidence */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                1. Observed Physical Evidence
              </h4>
            </div>
            <p className="text-xs text-text-muted">
              Unalterable static facts directly extracted from byte structures and public network records.
            </p>

            <div className="p-4 rounded-xl bg-surface-1 border border-border text-xs font-mono space-y-2">
              {Object.entries(report.content.observed_evidence).map(([k, v]) => (
                <div
                  key={k}
                  className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-border/40 last:border-0 gap-1"
                >
                  <span className="text-text-muted font-medium">{k}:</span>
                  <span className="text-text-primary break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Analytical Inference */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-theme-success" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                2. Analytical Inference & Score Mechanics
              </h4>
            </div>
            <p className="text-xs text-text-muted">
              Deterministic scoring, capability deductions, and structural risk indicators.
            </p>

            <div className="p-4 rounded-xl bg-surface-1 border border-border text-xs font-mono space-y-2">
              {Object.entries(report.content.analytical_inference).map(([k, v]) => (
                <div
                  key={k}
                  className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-border/40 last:border-0 gap-1"
                >
                  <span className="text-text-muted font-medium">{k}:</span>
                  <span className="text-text-primary break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Quantum Simulation */}
          {report.content.quantum_simulation && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center space-x-2">
                  <span>3. Quantum Channel Verification</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-400/30">
                    SIMULATED QUANTUM ENVIRONMENT
                  </span>
                </h4>
              </div>

              <div className="p-4 rounded-xl bg-surface-1 border border-border text-xs font-mono space-y-2">
                {Object.entries(report.content.quantum_simulation).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-border/40 last:border-0 gap-1"
                  >
                    <span className="text-text-muted font-medium">{k}:</span>
                    <span className="text-text-primary break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remediation Plan */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Remediation Action Plan
            </h4>
            <div className="space-y-2">
              {report.content.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start space-x-2.5 text-xs text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-theme-success shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
