import React, { useState, useEffect } from "react";
import {
  History,
  FileSearch,
  Globe2,
  Atom,
  FileText,
  Search,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  ArrowUpDown,
  Filter,
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
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "RISK">("NEWEST");
  const [scans, setScans] = useState<any[]>([]);
  const [reconScans, setReconScans] = useState<any[]>([]);
  const [quantumSims, setQuantumSims] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllHistory = async () => {
    setLoading(true);
    try {
      const [s, r, q, rep] = await Promise.all([
        api.listScans().catch(() => []),
        api.listReconScans().catch(() => []),
        api.listQuantumSimulations().catch(() => []),
        api.listReports().catch(() => []),
      ]);
      setScans(s);
      setReconScans(r);
      setQuantumSims(q);
      setReports(rep);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllHistory();
  }, []);

  // Consolidate into unified records
  const unifiedRecords = [
    ...scans.map((s) => ({
      id: s.scan_id,
      title: s.filename,
      category: "FILES",
      type: "FILE_SCAN",
      level: (s.risk_level || "SAFE") as VerdictLevel,
      score: typeof s.risk_score === "number" && Number.isFinite(s.risk_score) ? s.risk_score : 0,
      status: "Completed",
      date: s.created_at,
    })),
    ...reconScans.map((r) => ({
      id: r.id,
      title: r.target,
      category: "RECON",
      type: "RECON_SCAN",
      level: (r.exposure_level || "SAFE") as VerdictLevel,
      score: typeof r.exposure_score === "number" && Number.isFinite(r.exposure_score) ? r.exposure_score : 0,
      status: "Completed",
      date: r.created_at,
    })),
    ...quantumSims.map((q) => ({
      id: q.id,
      title: `Quantum: ${q.scenario}`,
      category: "QUANTUM",
      type: "QUANTUM_SIM",
      level: (q.verdict === "NO ATTACK DETECTED" ? "SAFE" : "HIGH") as VerdictLevel,
      score: typeof q.deviation === "number" && Number.isFinite(q.deviation) ? q.deviation * 100 : 0,
      status: "Completed",
      date: q.created_at,
    })),
    ...reports.map((rep) => ({
      id: rep.id,
      title: rep.title,
      category: "REPORTS",
      type: "SECURITY_REPORT",
      level: "SAFE" as VerdictLevel,
      score: 0,
      status: "Completed",
      date: rep.created_at,
    })),
  ];

  // Filtering
  const filteredRecords = unifiedRecords.filter((rec) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (rec.title || "").toLowerCase().includes(q) ||
      (rec.id || "").toLowerCase().includes(q) ||
      rec.category.toLowerCase().includes(q);

    if (activeFilter === "ALL") return matchesSearch;
    return matchesSearch && rec.category === activeFilter;
  });

  // Sorting
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (sortBy === "NEWEST") {
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    }
    if (sortBy === "OLDEST") {
      return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
    }
    if (sortBy === "RISK") {
      return b.score - a.score;
    }
    return 0;
  });

  const filterTabs = [
    { id: "ALL", label: "All Records" },
    { id: "FILES", label: "Files" },
    { id: "RECON", label: "Recon" },
    { id: "QUANTUM", label: "Quantum" },
    { id: "REPORTS", label: "Reports" },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-14">
      {/* Header Banner */}
      <Card surface="raised" className="p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div>
          <div className="flex items-center space-x-2.5 mb-3">
            <Badge variant="neutral" size="sm">Audit Log</Badge>
            <span className="text-xs font-mono text-text-muted">
              Tamper-Evident Chronology
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
            Security Audit Trail
          </h1>
          <p className="text-base text-text-secondary mt-2 max-w-2xl leading-relaxed">
            Search, filter, and inspect previous deterministic file quarantine scans, passive reconnaissance assessments, quantum runs, and generated reports.
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

      {/* Filter, Search & Sort Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search by filename, scan ID, or domain */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by filename, domain, or scan ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl neu-inset bg-surface-0/60 text-sm font-mono text-text-primary placeholder:text-text-muted focus-ring"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center p-1.5 rounded-2xl neu-inset-sm bg-surface-0/70 overflow-x-auto">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
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

        {/* Sort Selector */}
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl neu-button text-text-muted shrink-0">
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 rounded-xl neu-inset bg-surface-0 text-xs font-semibold text-text-primary focus:outline-none cursor-pointer"
          >
            <option value="NEWEST">Newest First</option>
            <option value="OLDEST">Oldest First</option>
            <option value="RISK">Highest Risk</option>
          </select>
        </div>
      </div>

      {/* History Records List */}
      {sortedRecords.length === 0 ? (
        <Card surface="raised" className="p-14">
          <EmptyState
            icon={<History className="w-10 h-10 text-text-muted" />}
            title="No audit records match your query"
            description="Clear your filter or run a new file quarantine or recon scan to populate the timeline."
            actionLabel={searchQuery ? "Clear Search" : undefined}
            onAction={() => setSearchQuery("")}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedRecords.map((rec) => {
            let Icon = FileSearch;
            let iconColor = "text-primary";
            if (rec.category === "RECON") {
              Icon = Globe2;
              iconColor = "text-emerald-500";
            } else if (rec.category === "QUANTUM") {
              Icon = Atom;
              iconColor = "text-purple-500";
            } else if (rec.category === "REPORTS") {
              Icon = FileText;
              iconColor = "text-amber-500";
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
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>

                  <div className="overflow-hidden">
                    <div className="text-base font-bold text-text-primary truncate group-hover:text-primary transition-colors">
                      {rec.title}
                    </div>
                    <div className="text-xs text-text-muted mt-1 flex flex-wrap items-center gap-2">
                      <span className="capitalize font-semibold text-text-secondary">
                        {rec.category.toLowerCase()}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-xs text-text-muted">
                        ID: {rec.id.substring(0, 16)}…
                      </span>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ● {rec.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-border/50 pt-3 sm:pt-0">
                  <div className="text-right flex items-center space-x-2 text-xs text-text-muted font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{rec.date ? new Date(rec.date).toLocaleDateString() : "Recent"}</span>
                  </div>

                  {rec.category !== "REPORTS" && (
                    <Badge variant={badgeVariant} size="md">
                      {rec.level} ({rec.score.toFixed(0)})
                    </Badge>
                  )}

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
