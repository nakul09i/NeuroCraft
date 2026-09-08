import React, { useState, useEffect } from "react";
import {
  History,
  FileSearch,
  Globe,
  Atom,
  Search,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../api";
import { VerdictLevel } from "../../types";

export interface HistoryViewProps {
  onNavigateToScan?: (scanId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onNavigateToScan }) => {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [scans, setScans] = useState<any[]>([]);
  const [reconScans, setReconScans] = useState<any[]>([]);
  const [quantumSims, setQuantumSims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllHistory = async () => {
    setLoading(true);
    try {
      const [s, r, q] = await Promise.all([
        api.listScans().catch(() => []),
        api.listReconScans().catch(() => []),
        api.listQuantumSimulations().catch(() => []),
      ]);
      setScans(s);
      setReconScans(r);
      setQuantumSims(q);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllHistory();
  }, []);

  // Consolidate into unified history records
  const unifiedRecords = [
    ...scans.map((s) => ({
      id: s.scan_id,
      title: s.filename,
      type: "FILE_SCAN",
      level: (s.risk_level || "SAFE") as VerdictLevel,
      score: typeof s.risk_score === "number" && Number.isFinite(s.risk_score) ? s.risk_score : 0,
      date: s.created_at,
    })),
    ...reconScans.map((r) => ({
      id: r.id,
      title: r.target,
      type: "RECON_SCAN",
      level: (r.exposure_level || "SAFE") as VerdictLevel,
      score: typeof r.exposure_score === "number" && Number.isFinite(r.exposure_score) ? r.exposure_score : 0,
      date: r.created_at,
    })),
    ...quantumSims.map((q) => ({
      id: q.id,
      title: `Quantum Channel: ${q.scenario}`,
      type: "QUANTUM_SIM",
      level: (q.verdict === "NO ATTACK DETECTED" ? "SAFE" : "HIGH") as VerdictLevel,
      score: typeof q.deviation === "number" && Number.isFinite(q.deviation) ? q.deviation * 100 : 0,
      date: q.created_at,
    })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const filteredRecords = unifiedRecords.filter((rec) => {
    const matchesQuery = (rec.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === "ALL") return matchesQuery;
    return matchesQuery && rec.level === activeFilter;
  });

  const filterTabs = [
    { id: "ALL", label: "All Records" },
    { id: "SAFE", label: "Safe" },
    { id: "LOW", label: "Low" },
    { id: "MEDIUM", label: "Medium" },
    { id: "HIGH", label: "High / Critical" },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-14">
      {/* Soft Neumorphic Hero Header Banner */}
      <Card surface="raised" className="p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div>
          <div className="flex items-center space-x-3 mb-3">
            <Badge variant="neutral" size="sm">Audit Trail</Badge>
            <span className="text-sm font-mono text-text-muted">
              Tamper-Evident Chronology
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
            Security Audit Trail
          </h1>
          <p className="text-base text-text-secondary mt-2 max-w-2xl leading-relaxed">
            Search, filter, and inspect previous deterministic file quarantine scans, passive reconnaissance assessments, and Bell-state quantum telemetry.
          </p>
        </div>

        <Button
          size="md"
          variant="secondary"
          onClick={loadAllHistory}
          loading={loading}
          icon={<RefreshCw className="w-4 h-4" />}
          className="neu-button font-medium shrink-0"
        >
          Refresh Log
        </Button>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by file name or domain target…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl neu-inset bg-surface-0/60 text-sm font-mono text-text-primary placeholder:text-text-muted focus-ring"
          />
        </div>

        {/* Soft Neumorphic Segmented Tabs */}
        <div className="flex items-center p-1.5 rounded-2xl neu-inset-sm bg-surface-0/70 overflow-x-auto">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "neu-raised-sm bg-surface-0 text-primary shadow-xs"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* History List */}
      {filteredRecords.length === 0 ? (
        <Card surface="raised" className="p-14">
          <EmptyState
            icon={<History className="w-10 h-10 text-text-muted" />}
            title="No audit records found"
            description="Your previous file quarantine analyses, recon assessments, and quantum tests will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-3.5">
          {filteredRecords.map((rec) => {
            let Icon = FileSearch;
            let typeColor = "text-primary";
            if (rec.type === "RECON_SCAN") {
              Icon = Globe;
              typeColor = "text-emerald-500";
            }
            if (rec.type === "QUANTUM_SIM") {
              Icon = Atom;
              typeColor = "text-purple-500";
            }

            let badgeVariant: "safe" | "low" | "medium" | "high" | "critical" = "safe";
            if (rec.level === "LOW") badgeVariant = "low";
            else if (rec.level === "MEDIUM") badgeVariant = "medium";
            else if (rec.level === "HIGH" || rec.level === "CRITICAL") badgeVariant = "high";

            return (
              <Card
                key={rec.id}
                surface="raised"
                interactive
                onClick={() => {
                  if (rec.type === "FILE_SCAN" && onNavigateToScan) {
                    onNavigateToScan(rec.id);
                  }
                }}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center space-x-4 overflow-hidden w-full sm:w-auto">
                  <div className="p-3.5 rounded-2xl neu-inset-sm bg-surface-0/60 shrink-0">
                    <Icon className={`w-5 h-5 ${typeColor}`} />
                  </div>

                  <div className="overflow-hidden">
                    <div className="text-base font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                      {rec.title}
                    </div>
                    <div className="text-xs sm:text-sm text-text-muted mt-1 flex flex-wrap items-center gap-2">
                      <span className="capitalize font-medium text-text-secondary">
                        {rec.type.toLowerCase().replace("_", " ")}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-xs text-text-muted">
                        ID: {rec.id.substring(0, 16)}…
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-border/50 pt-3 sm:pt-0">
                  <div className="text-right flex items-center space-x-2 text-xs sm:text-sm text-text-muted">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{rec.date ? new Date(rec.date).toLocaleDateString() : "Recent"}</span>
                  </div>

                  <Badge variant={badgeVariant} size="md">
                    {rec.level} ({rec.score.toFixed(0)})
                  </Badge>

                  <div className="p-2 rounded-xl neu-button text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
