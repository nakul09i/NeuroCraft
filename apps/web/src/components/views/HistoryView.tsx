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
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="p-6 sm:p-7 rounded-xl border-2 border-border bg-surface-0 shadow-brutal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Badge variant="neutral" size="sm">AUDIT LOG</Badge>
            <span className="text-[10px] font-mono font-bold text-text-muted uppercase">
              TAMPER-EVIDENT TIMELINE
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display uppercase mt-1">
            SECURITY AUDIT TRAIL & HISTORY
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Search, filter, and inspect previous file scans, reconnaissance runs, and quantum trust experiments.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadAllHistory}
          loading={loading}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          REFRESH
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-text-primary stroke-[2.2]" />
          <input
            type="text"
            placeholder="Search by file name or target domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-0 border-2 border-border text-xs font-bold text-text-primary placeholder:text-text-muted focus-ring shadow-[2px_2px_0px_var(--border)] font-mono"
          />
        </div>

        <div className="border-2 border-border rounded-lg shadow-brutal-sm bg-surface-0 p-0.5">
          <Tabs
            size="sm"
            activeId={activeFilter}
            onChange={setActiveFilter}
            items={[
              { id: "ALL", label: "ALL RECORDS" },
              { id: "SAFE", label: "SAFE" },
              { id: "LOW", label: "LOW" },
              { id: "MEDIUM", label: "MEDIUM" },
              { id: "HIGH", label: "HIGH" },
            ]}
          />
        </div>
      </div>

      {/* History List */}
      {filteredRecords.length === 0 ? (
        <Card level={0} className="p-12">
          <EmptyState
            icon={<History className="w-8 h-8 text-text-muted stroke-[2.2]" />}
            title="NO AUDIT RECORDS FOUND."
            description="Your previous file scans, recon assessments, and quantum tests will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-3">
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
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5 overflow-hidden">
                  <div className="p-2.5 rounded-lg border-2 border-border bg-surface-1 text-text-primary shrink-0 shadow-[2px_2px_0px_var(--border)]">
                    <Icon className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-black font-display text-text-primary truncate">
                      {rec.title}
                    </div>
                    <div className="text-[10px] font-mono text-text-muted mt-0.5 flex items-center space-x-2">
                      <span className="font-bold text-text-secondary">{rec.type.replace("_", " ")}</span>
                      <span>·</span>
                      <span>ID: {rec.id.substring(0, 14)}...</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] font-mono font-bold text-text-muted">
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
