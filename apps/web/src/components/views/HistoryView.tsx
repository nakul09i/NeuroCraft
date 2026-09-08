import React, { useState, useEffect } from "react";
import {
  History,
  FileSearch,
  Globe,
  Atom,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
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
      score: s.risk_score,
      date: s.created_at,
    })),
    ...reconScans.map((r) => ({
      id: r.id,
      title: r.target,
      type: "RECON_SCAN",
      level: (r.exposure_level || "SAFE") as VerdictLevel,
      score: r.exposure_score,
      date: r.created_at,
    })),
    ...quantumSims.map((q) => ({
      id: q.id,
      title: `Quantum: ${q.scenario}`,
      type: "QUANTUM_SIM",
      level: (q.verdict === "NO ATTACK DETECTED" ? "SAFE" : "HIGH") as VerdictLevel,
      score: q.deviation * 100,
      date: q.created_at,
    })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const filteredRecords = unifiedRecords.filter((rec) => {
    const matchesQuery = rec.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === "ALL") return matchesQuery;
    return matchesQuery && rec.level === activeFilter;
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-primary-subtle text-primary text-[11px] font-mono font-bold mb-2">
            <History className="w-3.5 h-3.5" />
            <span>AUDIT TRAIL & HISTORY</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Security History & Past Scans
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
          Refresh
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by file name or target domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-0 border border-border text-xs text-text-primary focus-ring"
          />
        </div>

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

      {/* History List */}
      {filteredRecords.length === 0 ? (
        <EmptyState
          icon={<History className="w-6 h-6" />}
          title="No history found"
          description="Your previous file scans, recon assessments, and quantum tests will appear here."
        />
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((rec) => {
            let Icon = FileSearch;
            if (rec.type === "RECON_SCAN") Icon = Globe;
            if (rec.type === "QUANTUM_SIM") Icon = Atom;

            let badgeVariant: "safe" | "low" | "medium" | "high" | "critical" = "safe";
            if (rec.level === "LOW") badgeVariant = "low";
            if (rec.level === "MEDIUM") badgeVariant = "medium";
            if (rec.level === "HIGH" || rec.level === "CRITICAL") badgeVariant = "high";

            return (
              <Card
                key={rec.id}
                level={1}
                interactive
                onClick={() => {
                  if (rec.type === "FILE_SCAN" && onNavigateToScan) {
                    onNavigateToScan(rec.id);
                  }
                }}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-surface-2 text-primary shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-text-primary">
                      {rec.title}
                    </div>
                    <div className="text-[11px] font-mono text-text-muted mt-0.5">
                      {rec.type.replace("_", " ")} • ID: {rec.id.substring(0, 16)}...
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] font-mono text-text-muted">
                      {rec.date ? new Date(rec.date).toLocaleDateString() : "Just now"}
                    </div>
                  </div>
                  <Badge variant={badgeVariant} size="sm">
                    {rec.level} ({rec.score.toFixed(0)})
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
