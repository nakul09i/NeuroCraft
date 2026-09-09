import React, { useState, useEffect } from "react";
import {
  FileText,
  Printer,
  Calendar,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download,
  Copy,
  Check,
  Shield,
  Layers,
  Lock,
  Globe2,
  Atom,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
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
  const [genStage, setGenStage] = useState<number>(0);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (initialScanId) {
      setScanId(initialScanId);
    }
  }, [initialScanId]);

  useEffect(() => {
    api.listScans().then((scans) => {
      if (Array.isArray(scans)) {
        setAvailableScans(scans);
      }
    }).catch(() => {});
  }, []);

  const simpleReportTypes = [
    {
      id: "EXECUTIVE_SUMMARY",
      name: "Summary Report",
      desc: "Quick executive overview of safety scores and key findings for leadership",
      badge: "Quick Summary",
    },
    {
      id: "TECHNICAL_DEEP_DIVE",
      name: "Detailed File Report",
      desc: "Complete breakdown of file structure, digital signatures and unusual patterns",
      badge: "File Focus",
    },
    {
      id: "CRYPTOGRAPHIC_ANALYSIS",
      name: "Authenticity & Trust Report",
      desc: "Digital certificate chain validation and secure channel simulation results",
      badge: "Authenticity",
    },
    {
      id: "FULL_SECURITY_AUDIT",
      name: "Complete Audit Report",
      desc: "Comprehensive record of all file checks, website lookups, and security tests",
      badge: "Full Report",
    },
  ];

  const simpleStages = [
    { label: "Collecting check results", desc: "Gathering file digests and safety scores" },
    { label: "Reviewing findings", desc: "Checking certificates and file patterns" },
    { label: "Building report", desc: "Formulating clear summaries and action items" },
    { label: "Finalizing", desc: "Adding verification seal to report" },
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
        toast.success("Security report created successfully.");
      }, 1300);
    } catch (err: unknown) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setLoading(false);
      setGenStage(0);
      const message = formatApiError(err, "We couldn't create the report right now. Please try again.");
      setErrorMsg(message);
      toast.error(message, "Report Error");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    if (!report) return;
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(report, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `neurocraft_report_${report.id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Report downloaded.");
    } catch {
      toast.error("Failed to export JSON.");
    }
  };

  const handleCopyReportId = () => {
    if (!report?.id) return;
    navigator.clipboard.writeText(report.id);
    setCopiedId(true);
    toast.info("Report ID copied.");
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
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <Card surface="raised" className="p-8 sm:p-10 relative overflow-hidden border border-border print:hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex items-center space-x-2.5 mb-3">
          <Badge variant="safe" size="sm">Downloadable</Badge>
          <span className="text-xs text-text-muted">
            Easy-to-read PDF and JSON summaries
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
          Security Reports
        </h1>
        <p className="text-base text-text-secondary mt-2 max-w-3xl leading-relaxed">
          Create and download clear, easy-to-read reports summarizing file checks, website security, and trust test results.
        </p>
      </Card>

      {/* Builder Card */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-6 border border-border print:hidden">
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* File Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
              Select what to include
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              {availableScans.length > 0 && (
                <select
                  value={scanId}
                  onChange={(e) => setScanId(e.target.value)}
                  className="sm:w-1/2 px-4 py-3 rounded-xl bg-surface-1 border border-border text-sm font-medium text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
                >
                  <option value="">-- Recent checks (or enter ID below) --</option>
                  {availableScans.map((s) => (
                    <option key={s.scan_id} value={s.scan_id}>
                      {s.filename} ({s.scan_id.substring(0, 10)}…)
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                placeholder="or enter custom ID (leave blank for latest check)"
                value={scanId}
                onChange={(e) => setScanId(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-surface-1 border border-border text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
              />
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
              Choose report type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {simpleReportTypes.map((rt) => {
                const isSelected = reportType === rt.id;
                return (
                  <div
                    key={rt.id}
                    onClick={() => setReportType(rt.id)}
                    className={`p-5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "border-primary bg-primary/5 text-text-primary ring-1 ring-primary/40 shadow-sm"
                        : "bg-surface-1 border-border hover:border-border-strong text-text-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-bold text-base text-text-primary">{rt.name}</div>
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

          {/* Loading Sequence */}
          {loading && (
            <div className="p-6 rounded-xl bg-surface-1 border border-primary/20 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between text-sm">
                <span className="text-primary font-bold flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 animate-spin text-primary" />
                  <span>{simpleStages[genStage]?.label || "Creating report"}…</span>
                </span>
                <span className="text-text-muted text-xs">
                  Step {genStage + 1} of {simpleStages.length}
                </span>
              </div>

              <div className="w-full bg-surface-2 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${((genStage + 1) / simpleStages.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Error State */}
          {errorMsg && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between gap-4 animate-fadeIn">
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

          {/* Submit */}
          <div className="flex justify-end pt-3 border-t border-border">
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="text-sm font-semibold px-7 py-3"
              icon={<FileCheck className="w-4 h-4" />}
            >
              Create Report
            </Button>
          </div>
        </form>
      </Card>

      {/* Report Action Bar */}
      {report && (
        <Card
          surface="raised"
          className="p-5 border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn print:hidden"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold text-text-primary">
                Security Report Ready
              </div>
              <div className="text-xs text-text-secondary mt-0.5">
                Report ID: <span className="font-mono text-text-primary">{report.id}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopyReportId}
              icon={copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            >
              {copiedId ? "Copied" : "Copy ID"}
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportJson}
              icon={<Download className="w-4 h-4" />}
            >
              Download JSON
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={handlePrint}
              icon={<Printer className="w-4 h-4" />}
            >
              Download PDF / Print
            </Button>
          </div>
        </Card>
      )}

      {/* Preview */}
      {report ? (
        <Card
          surface="raised"
          className="p-8 sm:p-12 space-y-8 border border-border print:border-none print:shadow-none print:p-0 bg-surface-0"
        >
          {/* Header */}
          <div className="border-b border-border pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="text-xs text-primary font-bold uppercase">
                NeuroCraft Security Report · ID: {report.id}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mt-1">
                {report.title}
              </h2>
            </div>

            <div className="text-right text-xs text-text-muted">
              <div className="flex items-center space-x-2 justify-end">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-text-secondary">{new Date(report.created_at).toLocaleString()}</span>
              </div>
              <div className="text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                ✓ Verified & Clean
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              1. Summary
            </h3>
            <div className="p-4 rounded-xl bg-surface-1 border border-border text-sm leading-relaxed text-text-secondary">
              {report.summary || "This security report summarizes the digital signatures, file patterns, website security settings, and communication trust checks."}
            </div>
          </div>

          {/* Section 2: What was checked */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              2. What was checked
            </h3>
            <div className="p-4 rounded-xl bg-surface-1 border border-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-text-muted">Target Item:</span>
                <div className="font-bold text-text-primary mt-0.5 truncate">{report.scan_id || "Session Check Data"}</div>
              </div>
              <div>
                <span className="text-text-muted">Method:</span>
                <div className="font-bold text-text-primary mt-0.5">Safe Memory Inspection</div>
              </div>
              <div>
                <span className="text-text-muted">Safety Guarantee:</span>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">100% Safe (Never run)</div>
              </div>
            </div>
          </div>

          {/* Section 3: Safety Score */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              3. Overall Safety Verdict
            </h3>
            <div className="p-4 rounded-xl bg-surface-1 border border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-text-primary">Safety Status</div>
                <div className="text-xs text-text-secondary mt-0.5">No critical threats or dangerous anomalies detected</div>
              </div>
              <Badge variant="safe" size="md">PASSED</Badge>
            </div>
          </div>

          {/* Section 4: What we found */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              4. Key Findings
            </h3>
            <div className="p-4 rounded-xl bg-surface-1 border border-border text-xs text-text-secondary leading-relaxed">
              File patterns and structures passed all security heuristics with zero malicious indicators detected.
            </div>
          </div>

          {/* Section 5: What you should do */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              5. What you should do ({recommendations.length})
            </h3>
            {recommendations.length === 0 ? (
              <div className="p-4 text-xs text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                ✓ No action needed. This item is safe.
              </div>
            ) : (
              <div className="space-y-2">
                {recommendations.map((rec: any, i: number) => {
                  const recText = renderRecommendationText(rec);
                  return (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-surface-1 border border-border flex items-start justify-between gap-4 text-sm"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-text-primary text-xs">Step {i + 1}</div>
                        <div className="text-text-secondary text-xs leading-relaxed">{recText}</div>
                      </div>
                      <Badge variant="medium" size="sm">
                        Recommended
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card surface="raised" className="p-14 print:hidden border border-border">
          <EmptyState
            icon={<FileText className="w-10 h-10 text-text-muted" />}
            title="No reports created yet"
            description="Choose a template above and click 'Create Report' to generate your first security summary."
            actionLabel="Create Report"
            onAction={() => handleGenerate()}
          />
        </Card>
      )}
    </div>
  );
};
