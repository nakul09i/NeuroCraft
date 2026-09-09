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
  Calendar,
  ArrowUpDown,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing } from "../ui/ScoreRing";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../api";
import { VerdictLevel } from "../../types";

export interface HistoryViewProps {
  onNavigateToScan?: (scanId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onNavigateToScan }) => {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "SAFETY">("NEWEST");
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
      categoryLabel: "File Analysis",
      type: "FILE_SCAN",
      level: (s.risk_level || "SAFE") as VerdictLevel,
      safetyScore:
        typeof s.risk_score === "number" && Number.isFinite(s.risk_score)
          ? Math.max(0, 100 - s.risk_score)
          : 100,
      status: "Completed",
      date: s.created_at,
    })),
    ...reconScans.map((r) => ({
      id: r.id,
      title: r.target,
      category: "RECON",
      categoryLabel: "Passive Recon",
      type: "RECON_SCAN",
      level: (r.exposure_level || "SAFE") as VerdictLevel,
      safetyScore:
        typeof r.exposure_score === "number" && Number.isFinite(r.exposure_score)
          ? Math.max(0, 100 - r.exposure_score)
          : 100,
      status: "Completed",
      date: r.created_at,
    })),
    ...quantumSims.map((q) => ({
      id: q.id,
      title: `Verification: ${q.scenario}`,
      category: "QUANTUM",
      categoryLabel: "Trust Test",
      type: "QUANTUM_SIM",
      level: (q.verdict === "NO ATTACK DETECTED" ? "SAFE" : "HIGH") as VerdictLevel,
      safetyScore:
        typeof q.deviation === "number" && Number.isFinite(q.deviation)
          ? Math.max(0, 100 - q.deviation * 100)
          : 100,
      status: "Completed",
      date: q.created_at,
    })),
    ...reports.map((rep) => ({
      id: rep.id,
      title: rep.title,
      category: "REPORTS",
      categoryLabel: "Audit Report",
      type: "SECURITY_REPORT",
      level: "SAFE" as VerdictLevel,
      safetyScore: 100,
      status: "Generated",
      date: rep.created_at,
    })),
  ];

  // Filter
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

  // Sort
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (sortBy === "NEWEST") {
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    }
    if (sortBy === "OLDEST") {
      return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
    }
    if (sortBy === "SAFETY") {
      return b.safetyScore - a.safetyScore;
    }
    return 0;
  });

  // Group records by relative timeframe
  const groupRecordsByDate = (records: typeof unifiedRecords) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const pastWeek = today - 86400000 * 7;

    const groups: { [key: string]: typeof unifiedRecords } = {
      Today: [],
      Yesterday: [],
      "Past 7 Days": [],
      Older: [],
    };

    records.forEach((rec) => {
      const recTime = new Date(rec.date || 0).getTime();
      if (recTime >= today) {
        groups.Today.push(rec);
      } else if (recTime >= yesterday) {
        groups.Yesterday.push(rec);
      } else if (recTime >= pastWeek) {
        groups["Past 7 Days"].push(rec);
      } else {
        groups.Older.push(rec);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };

  const grouped = groupRecordsByDate(sortedRecords);

  const filterTabs = [
    { id: "ALL", label: "All Records", count: unifiedRecords.length },
    { id: "FILES", label: "Files", count: scans.length },
    { id: "RECON", label: "Recon", count: reconScans.length },
    { id: "QUANTUM", label: "Trust", count: quantumSims.length },
    { id: "REPORTS", label: "Reports", count: reports.length },
  ];

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "FILES":
        return <FileSearch className="w-4 h-4 text-primary" />;
      case "RECON":
        return <Globe2 className="w-4 h-4 text-emerald-500" />;
      case "QUANTUM":
        return <Atom className="w-4 h-4 text-purple-500" />;
      case "REPORTS":
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <History className="w-4 h-4 text-text-muted" />;
    }
  };

  const getBadgeVariant = (level?: string): "safe" | "low" | "medium" | "high" | "neutral" => {
    switch (level?.toUpperCase()) {
      case "SAFE":
        return "safe";
      case "LOW":
        return "low";
      case "MEDIUM":
        return "medium";
      case "HIGH":
      case "CRITICAL":
        return "high";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Audit Trail
            </span>
            <span className="text-text-muted">•</span>
            <Badge variant="neutral" size="sm">{unifiedRecords.length} Events</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            History
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Search, filter, and review all previous file analyses, recon queries, trust tests, and generated reports.
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={loadAllHistory}
          loading={loading}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          className="shrink-0 font-medium"
        >
          Refresh
        </Button>
      </div>

      {/* Filter, Search & Sort Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, domain, or ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-1 border border-border text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-surface-1 border border-border overflow-x-auto">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
                  isActive
                    ? "bg-surface-0 text-text-primary shadow-xs border border-border/80"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-primary/10 text-primary font-bold" : "bg-surface-2 text-text-muted"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="p-2 rounded-xl bg-surface-1 border border-border text-text-muted">
            <ArrowUpDown className="w-3.5 h-3.5" />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-surface-1 border border-border text-xs font-semibold text-text-primary focus:outline-none cursor-pointer"
          >
            <option value="NEWEST">Newest First</option>
            <option value="OLDEST">Oldest First</option>
            <option value="SAFETY">Safest First</option>
          </select>
        </div>
      </div>

      {/* History Records Grouped by Timeframe */}
      {sortedRecords.length === 0 ? (
        <Card surface="raised" className="p-12 border border-border">
          <EmptyState
            icon={<History className="w-8 h-8 text-text-muted" />}
            title="No records found"
            description="Run an analysis, passive recon, or trust test to populate your audit history."
            actionLabel={searchQuery ? "Clear Search" : undefined}
            onAction={() => setSearchQuery("")}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([timeLabel, items]) => (
            <div key={timeLabel} className="space-y-2.5">
              <div className="flex items-center space-x-2 px-1">
                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {timeLabel}
                </h2>
                <span className="text-xs text-text-muted">({items.length})</span>
              </div>

              <div className="space-y-2">
                {items.map((rec) => (
                  <Card
                    key={rec.id}
                    surface="raised"
                    className="p-3.5 sm:p-4 border border-border hover:border-border-strong transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="p-2.5 rounded-lg bg-surface-1 border border-border shrink-0">
                        {getCategoryIcon(rec.category)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm text-text-primary truncate">
                            {rec.title}
                          </span>
                          <Badge variant={getBadgeVariant(rec.level)} size="sm">
                            {rec.level}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-text-muted mt-0.5">
                          <span>{rec.categoryLabel}</span>
                          <span>•</span>
                          <span className="font-mono">{rec.id.substring(0, 10)}…</span>
                          <span>•</span>
                          <span>
                            {rec.date
                              ? new Date(rec.date).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Just now"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-center shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold font-mono text-text-primary">
                          {Math.round(rec.safetyScore)}/100
                        </div>
                        <div className="text-[10px] text-text-muted">Safety Score</div>
                      </div>

                      {rec.type === "FILE_SCAN" && onNavigateToScan && (
                        <button
                          type="button"
                          onClick={() => onNavigateToScan(rec.id)}
                          className="p-1.5 rounded-lg bg-surface-1 hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                          title="Open analysis"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
