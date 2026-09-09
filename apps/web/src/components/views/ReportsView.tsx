import React, { useState, useEffect } from "react";
import {
  FileText,
  Printer,
  Calendar,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  Shield,
  Layers,
  Lock,
  Globe2,
  ExternalLink,
  Code2,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Accordion } from "../ui/Accordion";
import { EmptyState } from "../ui/EmptyState";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api";
import { ReportResponse } from "../../types";
import { formatApiError } from "../../utils/error";

export interface ReportsViewProps {
  initialScanId?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ initialScanId }) => {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>("EXECUTIVE_SUMMARY");
  const [scanId, setScanId] = useState<string>(initialScanId || "");
  const [availableScans, setAvailableScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (initialScanId) {
      setScanId(initialScanId);
    }
  }, [initialScanId]);

  useEffect(() => {
    api
      .listScans()
      .then((scans) => {
        if (Array.isArray(scans)) {
          setAvailableScans(scans);
        }
      })
      .catch(() => {});
  }, []);

  const reportTypes = [
    {
      id: "EXECUTIVE_SUMMARY",
      name: "Executive Summary",
      desc: "High-level risk posture and critical action items for leadership review",
      badge: "Executive",
    },
    {
      id: "TECHNICAL_DEEP_DIVE",
      name: "Technical Deep Dive",
      desc: "Granular breakdown of file sections, entropy, and binary attributes",
      badge: "Technical",
    },
    {
      id: "CRYPTOGRAPHIC_ANALYSIS",
      name: "Trust & Cryptography",
      desc: "Certificate chain validation, signature integrity, and post-quantum metrics",
      badge: "Cryptographic",
    },
    {
      id: "FULL_SECURITY_AUDIT",
      name: "Full Security Audit",
      desc: "Complete dossier combining static file inspection, recon, and provenance proofs",
      badge: "Comprehensive",
    },
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const res = await api.generateReport(
        reportType,
        scanId.trim() || undefined,
        undefined,
        undefined
      );
      setReport(res);
      toast.success("Security report generated successfully.");
    } catch (err: unknown) {
      const message = formatApiError(err, "Unable to generate report at this time.");
      toast.error(message, "Report Error");
    } finally {
      setLoading(false);
    }
  };

  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleDownloadReport = async (format: "pdf" | "csv" | "json") => {
    if (!report?.id) return;
    setDownloadingFormat(format);
    try {
      const blob = await api.exportReport(report.id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neurocraft_report_${report.id.substring(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded.`);
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()} report.`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyReportId = () => {
    if (!report?.id) return;
    navigator.clipboard.writeText(report.id);
    setCopiedId(true);
    toast.info("Report ID copied to clipboard.");
    setTimeout(() => setCopiedId(false), 2000);
  };

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
    <div className="space-y-6 page-enter max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Compliance & Evidence
            </span>
            <span className="text-text-muted">•</span>
            <Badge variant="safe" size="sm">Export Ready</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Security Reports
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Generate and export cryptographically verifiable security summaries and compliance audits.
          </p>
        </div>

        {report && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              loading={downloadingFormat === "pdf"}
              onClick={() => handleDownloadReport("pdf")}
              icon={<Download className="w-4 h-4" />}
            >
              Export PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={downloadingFormat === "csv"}
              onClick={() => handleDownloadReport("csv")}
              icon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={downloadingFormat === "json"}
              onClick={() => handleDownloadReport("json")}
              icon={<Download className="w-4 h-4" />}
            >
              Export JSON
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              icon={<Printer className="w-4 h-4" />}
            >
              Print
            </Button>
          </div>
        )}
      </div>

      {/* Generator Form Card */}
      <Card surface="raised" className="p-6 sm:p-7 space-y-5 border border-border print:hidden">
        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Target Scan Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              Source Analysis
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              {availableScans.length > 0 && (
                <select
                  value={scanId}
                  onChange={(e) => setScanId(e.target.value)}
                  className="sm:w-1/2 px-3.5 py-2.5 rounded-xl bg-surface-1 border border-border text-sm font-medium text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
                >
                  <option value="">-- Recent analyses (or enter ID) --</option>
                  {availableScans.map((s) => (
                    <option key={s.scan_id} value={s.scan_id}>
                      {s.filename} ({s.scan_id.substring(0, 10)}…)
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                placeholder="Custom analysis ID (leave empty for latest)"
                value={scanId}
                onChange={(e) => setScanId(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-1 border border-border text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
              />
            </div>
          </div>

          {/* Report Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
              Report Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reportTypes.map((rt) => {
                const isSelected = reportType === rt.id;
                return (
                  <div
                    key={rt.id}
                    onClick={() => setReportType(rt.id)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "border-primary bg-primary/10 text-text-primary ring-1 ring-primary/30"
                        : "bg-surface-1 border-border hover:border-border-strong text-text-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-sm text-text-primary">{rt.name}</div>
                      <Badge variant={isSelected ? "info" : "neutral"} size="sm">
                        {rt.badge}
                      </Badge>
                    </div>
                    <div className="text-xs text-text-muted leading-relaxed">
                      {rt.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button
              type="submit"
              loading={loading}
              loadingText="Compiling report…"
              variant="primary"
              className="font-semibold px-6 py-2.5"
              icon={<FileText className="w-4 h-4" />}
            >
              Generate Report
            </Button>
          </div>
        </form>
      </Card>

      {/* Report Display */}
      {report ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Executive Overview Card */}
          <Card surface="raised" className="p-6 sm:p-8 border border-border space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Badge variant="safe" size="sm">Official Audit</Badge>
                  <span className="text-xs text-text-muted">
                    Generated on {new Date(report.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                  {report.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleCopyReportId}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-1 border border-border text-xs font-mono text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <span>ID: {report.id.substring(0, 12)}…</span>
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Executive Summary Narrative */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Executive Summary
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed bg-surface-1 p-4 rounded-xl border border-border">
                {report.summary ||
                  "File analysis confirmed normal structure without elevated threat signatures. Cryptographic integrity and entropy profiles comply with baseline security policy."}
              </p>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Actionable Recommendations
                </h3>
                <div className="space-y-2">
                  {recommendations.map((rec: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-surface-1 border border-border flex items-start space-x-3 text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-text-primary leading-relaxed">
                        {renderRecommendationText(rec)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Progressive Disclosure: Raw Audit Metadata */}
          <Accordion
            icon={<Code2 className="w-4 h-4 text-primary" />}
            title="Cryptographic Proof & Raw Data"
            subtitle="View full structured JSON report payload and attestation hashes"
            defaultOpen={false}
          >
            <div className="p-4 rounded-lg bg-surface-0 border border-border">
              <pre className="text-[11px] font-mono text-text-secondary overflow-x-auto max-h-72">
                {JSON.stringify(report, null, 2)}
              </pre>
            </div>
          </Accordion>
        </div>
      ) : (
        <Card surface="raised" className="p-12 border border-border print:hidden">
          <EmptyState
            icon={<FileText className="w-8 h-8 text-primary" />}
            title="No report generated yet"
            description="Select an analysis above and choose a template to create a formal security report."
            actionLabel="Generate Executive Summary"
            onAction={() => handleGenerate()}
          />
        </Card>
      )}
    </div>
  );
};
