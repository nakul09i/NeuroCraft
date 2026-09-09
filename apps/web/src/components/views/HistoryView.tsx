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

  // Consolidate into unified records with friendly labels
  const unifiedRecords = [
    ...scans.map((s) => ({
      id: s.scan_id,
      title: s.filename,
      category: "FILES",
      categoryLabel: "File Check",
      type: "FILE_SCAN",
      level: (s.risk_level || "SAFE") as VerdictLevel,
      safetyScore: typeof s.risk_score === "number" && Number.isFinite(s.risk_score) ? Math.max(0, 100 - s.risk_score) : 100,
      status: "Completed",
      date: s.created_at,
    })),
    ...reconScans.map((r) => ({
      id: r.id,
      title: r.target,
      category: "RECON",
      categoryLabel: "Website Check",
      type: "RECON_SCAN",
      level: (r.exposure_level || "SAFE") as VerdictLevel,
      safetyScore: typeof r.exposure_score === "number" && Number.isFinite(r.exposure_score) ? Math.max(0, 100 - r.exposure_score) : 100,
      status: "Completed",
      date: r.created_at,
    })),
    ...quantumSims.map((q) => ({
      id: q.id,
      title: `Trust Test: ${q.scenario}`,
      category: "QUANTUM",
      categoryLabel: "Trust Test",
      type: "QUANTUM_SIM",
      level: (q.verdict === "NO ATTACK DETECTED" ? "SAFE" : "HIGH") as VerdictLevel,
      safetyScore: typeof q.deviation === "number" && Number.isFinite(q.deviation) ? Math.max(0, 100 - q.deviation * 100) : 100,
      status: "Completed",
      date: q.created_at,
    })),
    ...reports.map((rep) => ({
      id: rep.id,
      title: rep.title,
      category: "REPORTS",
      categoryLabel: "Report",
      type: "SECURITY_REPORT",
      level: "SAFE" as VerdictLevel,
      safetyScore: 100,
      status: "Created",
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
    if (sortBy === "SAFETY") {
      return b.safetyScore - a.safetyScore;
    }
    return 0;
  });

  const filterTabs = [
    { id: "ALL", label: "All Checks", count: unifiedRecords.length },
    { id: "FILES", label: "Files", count: scans.length },
    { id: "RECON", label: "Websites", count: reconScans.length },
    { id: "QUANTUM", label: "Trust Tests", count: quantumSims.length },
    { id: "REPORTS", label: "Reports", count: reports.length },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <Card surface="raised" className="p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden border border-border">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Badge variant="neutral" size="sm">Past Activity</Badge>
            <span className="text-xs text-text-muted">
              Everything you've checked
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
            Check History
          </h1>
          <p className="text-base text-text-secondary mt-2 max-w-2xl leading-relaxed">
            Search, filter, and review all previous file checks, website security lookups, trust tests, and created reports.
          </p>
        </div>

        <Button
          size="md"
          variant="secondary"
          onClick={loadAllHistory}
          loading={loading}
          icon={<RefreshCw className="w-4 h-4" />}
          className="shrink-0"
        >
          Refresh
        </Button>
      </Card>

      {/* Filter, Search & Sort Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by file name or website…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-1 border border-border text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-surface-1 border border-border overflow-x-auto">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  isActive
                    ? "bg-surface-0 text-text-primary shadow-xs border border-border/80"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-primary/10 text-primary font-bold" : "bg-surface-2 text-text-muted"}`}>
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

      {/* History Records List */}
      {sortedRecords.length === 0 ? (
        <Card surface="raised" className="p-14 border border-border">
          <EmptyState
            icon={<History className="w-10 h-10 text-text-muted" />}
            title="No checks found"
            description="Check a file or website above to start your history list!"
            actionLabel={searchQuery ? "Clear Search" : undefined}
            onAction={() => setSearchQuery("")}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {sortedRecords.map((rec) => {
            let Icon = FileSearch;
            let iconBg = "bg-primary/10 text-primary";
            if (rec.category === "RECON") {
              Icon = Globe2;
              iconBg = "bg-emerald-500/10 text-emerald-500";
            } else if (rec.category === "QUANTUM") {
              Icon = Atom;
              iconBg = "bg-purple-500/10 text-purple-500";
            } else if (rec.category === "REPORTS") {
              Icon = FileText;
              iconBg = "bg-amber-500/10 text-amber-500";
            }

            let badgeVariant: "safe" | "low" | "medium" | "high" | "critical" = "safe";
            let label = "SAFE";
            if (rec.level === "LOW") { badgeVariant = "low"; label = "LOW RISK"; }
            else if (rec.level === "MEDIUM") { badgeVariant = "medium"; label = "MEDIUM RISK"; }
            else if (rec.level === "HIGH" || rec.level === "CRITICAL") { badgeVariant = "high"; label = "HIGH RISK"; }

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
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group border border-border"
              >
                <div className="flex items-center space-x-3.5 overflow-hidden w-full sm:w-auto">
                  <div className={`p-2.5 rounded-xl ${iconBg} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="overflow-hidden">
                    <div className="text-sm sm:text-base font-bold text-text-primary truncate group-hover:text-primary transition-colors">
                      {rec.title}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text-secondary">
                        {rec.categoryLabel}
                      </span>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ {rec.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-3.5 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-border/50 pt-2.5 sm:pt-0">
                  <div className="text-right flex items-center space-x-1.5 text-xs text-text-muted">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{rec.date ? new Date(rec.date).toLocaleDateString() : "Recent"}</span>
                  </div>

                  {rec.category !== "REPORTS" && (
                    <Badge variant={badgeVariant} size="sm">
                      {label} ({rec.safetyScore.toFixed(0)}/100)
                    </Badge>
                  )}

                  <div className="p-1.5 rounded-lg text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all">
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
