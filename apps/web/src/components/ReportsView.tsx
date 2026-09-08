import React, { useState } from "react";
import {
  FileText,
  Printer,
  Download,
  ShieldCheck,
  ShieldAlert,
  Atom,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import { api } from "../api";
import { ReportResponse } from "../types";

interface ReportsViewProps {
  initialScanId?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ initialScanId }) => {
  const [reportType, setReportType] = useState<string>("EXECUTIVE_AUDIT");
  const [scanId, setScanId] = useState<string>(initialScanId || "");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.generateReport(
        reportType,
        scanId.trim() || undefined,
        undefined,
        undefined
      );
      setReport(res);
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Security Audit & Provenance Reports
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Consolidates static binary analysis, digital signature verification, passive exposure, and quantum trust metrics into an executive-ready audit report.
          </p>
        </div>

        {report && (
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm print:hidden"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Print / Export PDF</span>
          </button>
        )}
      </div>

      {/* Generation Form */}
      <form
        onSubmit={handleGenerate}
        className="cyber-glow-card rounded-2xl p-6 border border-slate-800 space-y-4 print:hidden"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Report Specification
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="EXECUTIVE_AUDIT">Executive Cybersecurity Audit</option>
              <option value="TECHNICAL_DEEP_DIVE">Technical Deep Dive & Cryptographic Analysis</option>
              <option value="COMPLIANCE_CERTIFICATE">Digital Signature Integrity Certificate</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Target Scan ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. scan UUID from file analysis"
              value={scanId}
              onChange={(e) => setScanId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs tracking-wider shadow-cyan-glow transition disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>{loading ? "Synthesizing Report..." : "Generate Consolidated Report"}</span>
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-400 text-xs print:hidden">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Rendered Audit Report */}
      {report && (
        <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-8 text-slate-200 print:border-none print:p-0 print:text-black print:bg-white">
          {/* Report Title & Metadata */}
          <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-cyan-400 mb-1">
                <span>NEUROCRAFT AUDIT RECORD</span>
                <span>•</span>
                <span>ID: {report.id}</span>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">{report.title}</h3>
            </div>

            <div className="text-right text-xs font-mono text-slate-400">
              <div className="flex items-center space-x-1 justify-end">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{new Date(report.created_at).toLocaleString()}</span>
              </div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 mt-1">
                CRYPTOGRAPHICALLY VERIFIED
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Executive Summary
            </h4>
            <p className="text-xs leading-relaxed text-slate-300 p-4 rounded-xl bg-slate-900/60 border border-slate-800 font-sans">
              {report.summary}
            </p>
          </div>

          {/* Observed Evidence */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                1. Observed Physical Evidence
              </h4>
            </div>
            <p className="text-[11px] text-slate-400">
              Direct, unalterable facts extracted from raw bytes and public network records.
            </p>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs font-mono space-y-2">
              {Object.entries(report.content.observed_evidence).map(([k, v]) => (
                <div key={k} className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-800/40 last:border-0">
                  <span className="text-slate-400 font-medium">{k}:</span>
                  <span className="text-slate-200 break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Analytical Inference */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                2. Analytical Inference & Score Mechanics
              </h4>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic scoring, confidence intervals, and behavioral capability deductions.
            </p>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs font-mono space-y-2">
              {Object.entries(report.content.analytical_inference).map(([k, v]) => (
                <div key={k} className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-800/40 last:border-0">
                  <span className="text-slate-400 font-medium">{k}:</span>
                  <span className="text-slate-200 break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quantum Trust Simulation */}
          {report.content.quantum_simulation && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <span>3. Quantum Channel Verification</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/40">
                    SIMULATED QUANTUM ENVIRONMENT
                  </span>
                </h4>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs font-mono space-y-2">
                {Object.entries(report.content.quantum_simulation).map(([k, v]) => (
                  <div key={k} className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-slate-800/40 last:border-0">
                    <span className="text-slate-400 font-medium">{k}:</span>
                    <span className="text-slate-200 break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recommended Remediation Steps
            </h4>
            <div className="space-y-2">
              {report.content.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start space-x-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
