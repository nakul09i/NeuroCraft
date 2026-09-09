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
  ChevronLeft,
  Calendar,
  ArrowUpDown,
  Download,
  Filter,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../api";
import { ScanHistoryItem, VerdictLevel } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { fetchUserCloudScans } from "../../services/syncService";

export interface HistoryViewProps {
  onNavigateToScan?: (scanId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onNavigateToScan }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "HIGHEST_RISK" | "LOWEST_RISK">("NEWEST");
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [reconScans, setReconScans] = useState<any[]>([]);
  const [quantumSims, setQuantumSims] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const loadAllHistory = async () => {
    setLoading(true);
    try {
      const [s, r, q, rep, cloudScans] = await Promise.all([
        api.listScans({
          q: searchQuery.trim() || undefined,
          risk_level: riskFilter !== "ALL" ? riskFilter : undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          sort_by:
            sortBy === "NEWEST"
              ? "newest"
              : sortBy === "OLDEST"
              ? "oldest"
              : sortBy === "HIGHEST_RISK"
              ? "highest_risk"
              : "lowest_risk",
        }).catch(() => []),
        api.listReconScans().catch(() => []),
        api.listQuantumSimulations().catch(() => []),
        api.listReports().catch(() => []),
        user?.id ? fetchUserCloudScans(user.id).catch(() => []) : Promise.resolve([]),
      ]);

      // Deduplicate scans across local SQLite and cloud sync
      const scanMap = new Map<string, any>();
      for (const scan of s) {
        if (scan.scan_id) scanMap.set(scan.scan_id, scan);
      }
      for (const cs of cloudScans) {
        const id = cs.scanId || cs.scan_id || cs.id;
        if (id && !scanMap.has(id)) {
          scanMap.set(id, {
            id,
            scan_id: id,
            filename: cs.fileName,
            risk_level: cs.verdict,
            risk_score: cs.riskScore,
            confidence: "HIGH",
            file_type: "FILE",
            status: cs.syncStatus || "completed",
            created_at: cs.createdAt,
          });
        }
      }

      setScans(Array.from(scanMap.values()));
      setReconScans(r);
      setQuantumSims(q);
      setReports(rep);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllHistory();
  }, [user?.id, riskFilter, statusFilter, sortBy]);

  // Reset to page 1 on search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, riskFilter, statusFilter, sortBy]);

  const handleExportScan = async (
    scanId: string,
    format: "pdf" | "csv" | "json",
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      const blob = await api.exportScanReport(scanId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neurocraft_${scanId.substring(0, 10)}_report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded.`);
    } catch {
      toast.error(`Failed to download ${format.toUpperCase()} report.`);
    }
  };

  // Consolidate into unified audit records
  const unifiedRecords = [
    ...scans.map((s) => ({
      id: s.scan_id,
      title: s.filename,
      category: "FILES",
      categoryLabel: "File Analysis",
      type: "FILE_SCAN",
      level: (s.risk_level || "SAFE") as VerdictLevel,
      riskScore: typeof s.risk_score === "number" ? s.risk_score : 0,
      safetyScore:
        typeof s.risk_score === "number" && Number.isFinite(s.risk_score)
          ? Math.max(0, 100 - s.risk_score)
          : 100,
      status: s.status || "Completed",
      sha256: s.sha256,
      integrityStatus: s.integrity_status,
      date: s.created_at,
    })),
    ...reconScans.map((r) => ({
      id: r.id,
      title: r.target,
      category: "RECON",
      categoryLabel: "Passive Recon",
      type: "RECON_SCAN",
      level: (r.exposure_level || "SAFE") as VerdictLevel,
      riskScore: typeof r.exposure_score === "number" ? r.exposure_score : 0,
      safetyScore:
        typeof r.exposure_score === "number" && Number.isFinite(r.exposure_score)
          ? Math.max(0, 100 - r.exposure_score)
          : 100,
      status: "Completed",
      sha256: "",
      integrityStatus: "N/A",
      date: r.created_at,
    })),
    ...quantumSims.map((q) => ({
      id: q.id,
      title: `Verification: ${q.scenario}`,
      category: "QUANTUM",
      categoryLabel: "Trust Test",
      type: "QUANTUM_SIM",
      level: (q.verdict === "NO ATTACK DETECTED" ? "SAFE" : "HIGH") as VerdictLevel,
      riskScore: typeof q.deviation === "number" ? q.deviation * 100 : 0,
      safetyScore:
        typeof q.deviation === "number" && Number.isFinite(q.deviation)
          ? Math.max(0, 100 - q.deviation * 100)
          : 100,
      status: "Completed",
      sha256: "",
      integrityStatus: "N/A",
      date: q.created_at,
    })),
    ...reports.map((rep) => ({
      id: rep.id,
      title: rep.title,
      category: "REPORTS",
      categoryLabel: "Audit Report",
      type: "SECURITY_REPORT",
      level: "SAFE" as VerdictLevel,
      riskScore: 0,
      safetyScore: 100,
      status: "Generated",
      sha256: "",
      integrityStatus: "N/A",
      date: rep.created_at,
    })),
  ];

  // Client-side search and category filtering
  const filteredRecords = unifiedRecords.filter((rec) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (rec.title || "").toLowerCase().includes(q) ||
      (rec.id || "").toLowerCase().includes(q) ||
      (rec.sha256 || "").toLowerCase().includes(q) ||
      rec.category.toLowerCase().includes(q);

    if (activeFilter !== "ALL" && rec.category !== activeFilter) return false;
    if (riskFilter !== "ALL" && rec.level.toUpperCase() !== riskFilter.toUpperCase()) return false;
    if (statusFilter !== "ALL" && (rec.status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;

    return matchesSearch;
  });

  // Client-side deterministic sorting
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    if (sortBy === "NEWEST") {
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    }
    if (sortBy === "OLDEST") {
      return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
    }
    if (sortBy === "HIGHEST_RISK") {
      return b.riskScore - a.riskScore;
    }
    if (sortBy === "LOWEST_RISK") {
      return a.riskScore - b.riskScore;
    }
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const paginatedRecords = sortedRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Group current page records by relative timeframe
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

  const grouped = groupRecordsByDate(paginatedRecords);

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
    <div className="space-y-6 page-enter max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Investigation Records
            </span>
            <span className="text-text-muted">•</span>
            <Badge variant="neutral" size="sm">
              {unifiedRecords.length} Saved Analyses
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Scan History
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Search, filter, and review previous file analyses, network reconnaissance dossiers, and cryptographic integrity proofs.
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
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search by Filename or SHA-256 */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by filename, SHA-256 digest, or scan ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadAllHistory();
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-1 border border-border text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
            />
          </div>

          {/* Primary Entity Filter Tabs */}
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
                      isActive
                        ? "bg-primary/10 text-primary font-bold"
                        : "bg-surface-2 text-text-muted"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filters Bar: Risk Level, Operational Status & Deterministic Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-1 border border-border text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-text-muted font-medium mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-surface-0 border border-border text-text-primary font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="SAFE">Safe (0-14)</option>
              <option value="LOW">Low (15-39)</option>
              <option value="MEDIUM">Medium (40-69)</option>
              <option value="HIGH">High (70-89)</option>
              <option value="CRITICAL">Critical (90-100)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-surface-0 border border-border text-text-primary font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>

            {(searchQuery || riskFilter !== "ALL" || statusFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setRiskFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="text-[11px] font-semibold text-primary hover:underline ml-1 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-2">
            <div className="text-text-muted">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg bg-surface-0 border border-border text-text-primary font-semibold focus:outline-none cursor-pointer"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="HIGHEST_RISK">Highest Risk</option>
              <option value="LOWEST_RISK">Lowest Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Records Grouped by Timeframe */}
      {paginatedRecords.length === 0 ? (
        <Card surface="raised" className="p-12 border border-border">
          <EmptyState
            icon={<History className="w-8 h-8 text-text-muted" />}
            title="No scans yet"
            description="Analyze your first file or run passive recon to start building your persistent security history."
            actionLabel={searchQuery || riskFilter !== "ALL" ? "Clear Filters" : "Analyze First File"}
            onAction={() => {
              if (searchQuery || riskFilter !== "ALL" || statusFilter !== "ALL") {
                setSearchQuery("");
                setRiskFilter("ALL");
                setStatusFilter("ALL");
              } else if (onNavigateToScan) {
                onNavigateToScan("");
              }
            }}
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
                    <div
                      className="flex items-center space-x-3.5 min-w-0 flex-1 cursor-pointer"
                      onClick={() => {
                        if (rec.type === "FILE_SCAN" && onNavigateToScan) {
                          onNavigateToScan(rec.id);
                        }
                      }}
                    >
                      <div className="p-2.5 rounded-lg bg-surface-1 border border-border shrink-0">
                        {getCategoryIcon(rec.category)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm text-text-primary truncate hover:text-primary transition-colors">
                            {rec.title}
                          </span>
                          <Badge variant={getBadgeVariant(rec.level)} size="sm">
                            {rec.level}
                          </Badge>
                          {rec.integrityStatus && rec.integrityStatus !== "N/A" && (
                            <Badge variant="neutral" size="sm" className="hidden sm:inline-flex">
                              {rec.integrityStatus}
                            </Badge>
                          )}
                          <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-1 border border-border text-text-muted">
                            💾 Saved locally
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-text-muted mt-0.5">
                          <span>{rec.categoryLabel}</span>
                          <span>•</span>
                          <span className="font-mono">{rec.id.substring(0, 10)}…</span>
                          {rec.sha256 ? (
                            <>
                              <span>•</span>
                              <span className="font-mono hidden md:inline">
                                {rec.sha256.substring(0, 12)}…
                              </span>
                            </>
                          ) : null}
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

                    <div className="flex items-center space-x-2.5 self-end sm:self-center shrink-0">
                      <div className="text-right hidden sm:block mr-1">
                        <div className="text-xs font-bold font-mono text-text-primary">
                          {Math.round(rec.safetyScore)}/100
                        </div>
                        <div className="text-[10px] text-text-muted">Safety Score</div>
                      </div>

                      {/* Quick Export Actions for File Scans */}
                      {rec.type === "FILE_SCAN" && (
                        <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleExportScan(rec.id, "pdf", e)}
                            className="p-1.5 rounded-lg bg-surface-1 hover:bg-surface-2 text-text-muted hover:text-text-primary text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Download PDF report"
                          >
                            PDF
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleExportScan(rec.id, "csv", e)}
                            className="p-1.5 rounded-lg bg-surface-1 hover:bg-surface-2 text-text-muted hover:text-text-primary text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Download CSV report"
                          >
                            CSV
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleExportScan(rec.id, "json", e)}
                            className="p-1.5 rounded-lg bg-surface-1 hover:bg-surface-2 text-text-muted hover:text-text-primary text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Download JSON report"
                          >
                            JSON
                          </button>
                        </div>
                      )}

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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-text-muted">
              <span>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, sortedRecords.length)} of {sortedRecords.length} records
              </span>

              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <span className="font-semibold text-text-primary px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
