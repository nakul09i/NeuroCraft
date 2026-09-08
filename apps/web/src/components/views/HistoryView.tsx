import React, { useState, useEffect } from "react";
import {
  History,
  FileSearch,
  Globe,
  Atom,
  Search,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Tabs } from "../ui/Tabs";
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
      score: typeof s.risk_score === "number" && !isNaN(s.risk_score) ? s.risk_score : 0,
      date: s.created_at,
    })),
    ...reconScans.map((r) => ({
      id: r.id,
      title: r.target,
      type: "RECON_SCAN",
      level: (r.exposure_level || "SAFE") as VerdictLevel,
      score: typeof r.exposure_score === "number" && !isNaN(r.exposure_score) ? r.exposure_score : 0,
      date: r.created_at,
    })),
    ...quantumSims.map((q) => ({
      id: q.id,
      title: `Quantum: ${q.scenario}`,
      type: "QUANTUM_SIM",
      level: (q.verdict === "NO ATTACK DETECTED" ? "SAFE" : "HIGH") as VerdictLevel,
      score: typeof q.deviation === "number" && !isNaN(q.deviation) ? q.deviation * 100 : 0,
      date: q.created_at,
    })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const filteredRecords = unifiedRecords.filter((rec) => {
    const matchesQuery = rec.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === "ALL") return matchesQuery;
    return matchesQuery && rec.level === activeFilter;
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-14">
      {/* Header Banner */}
      <div className="p-7 rounded-2xl border border-border/70 bg-surface-0/70 backdrop-blur-sm shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="neutral" size="sm">Audit Log</Badge>
            <span className="text-xs text-text-muted">
              Tamper-Evident Timeline
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight mt-1">
            Security Audit Trail
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Search, filter, and inspect previous file scans, reconnaissance assessments, and quantum runs.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadAllHistory}
          loading={loading}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by file name or domain…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-1/60 border border-border/70 text-xs font-mono text-text-primary placeholder:text-text-muted focus-ring shadow-xs"
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-surface-0 p-0.5">
          <Tabs
            size="sm"
            activeId={activeFilter}
            onChange={setActiveFilter}
            items={[
              { id: "ALL", label: "All Records" },
              { id: "SAFE", label: "Safe" },
              { id: "LOW", label: "Low" },
              { id: "MEDIUM", label: "Medium" },
              { id: "HIGH", label: "High" },
            ]}
          />
        </div>
      </div>

      {/* History List */}
      {filteredRecords.length === 0 ? (
        <Card level={0} className="p-12">
          <EmptyState
            icon={<History className="w-8 h-8 text-text-muted" />}
            title="No audit records found"
            description="Your previous file scans, recon assessments, and quantum tests will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredRecords.map((rec) => {
            let Icon = FileSearch;
            if (rec.type === "RECON_SCAN") Icon = Globe;
            if (rec.type === "QUANTUM_SIM") Icon = Atom;

            let badgeVariant: "safe" | "low" | "medium" | "high" | "critical" = "safe";
            if (rec.level === "LOW") badgeVariant = "low";
            else if (rec.level === "MEDIUM") badgeVariant = "medium";
            else if (rec.level === "HIGH" || rec.level === "CRITICAL") badgeVariant = "high";

            return (
              <Card
                key={rec.id}
                level={0}
                interactive
                onClick={() => {
                  if (rec.type === "FILE_SCAN" && onNavigateToScan) {
                    onNavigateToScan(rec.id);
                  }
                }}
                className="p-4 flex items-center justify-between hover:bg-surface-1/50 transition-colors"
              >
                <div className="flex items-center space-x-3.5 overflow-hidden">
                  <div className="p-2.5 rounded-xl bg-surface-1/80 border border-border/60 text-text-secondary shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-medium text-text-primary truncate">
                      {rec.title}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5 flex items-center space-x-2">
                      <span className="capitalize">{rec.type.toLowerCase().replace("_", " ")}</span>
                      <span>·</span>
                      <span className="font-mono text-[10px]">ID: {rec.id.substring(0, 14)}…</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] text-text-muted">
                      {rec.date ? new Date(rec.date).toLocaleDateString() : "Just now"}
                    </div>
                  </div>
                  <Badge variant={badgeVariant} size="sm">
                    {rec.level} ({rec.score.toFixed(0)})
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
