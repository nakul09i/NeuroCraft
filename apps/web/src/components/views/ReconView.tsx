import React, { useState } from "react";
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  Search,
  Server,
  Lock,
  FileCheck,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing } from "../ui/ScoreRing";
import { Tabs } from "../ui/Tabs";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api";
import { ReconScanResponse, VerdictLevel } from "../../types";

export const ReconView: React.FC = () => {
  const { toast } = useToast();
  const [target, setTarget] = useState("");
  const [scanning, setScanning] = useState(false);
  const [reconData, setReconData] = useState<ReconScanResponse | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("dns");

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;

    setScanning(true);
    try {
      const res = await api.runRecon(target.trim());
      setReconData(res);
      toast.success(`Passive assessment completed for ${res.target}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to inspect domain", "Reconnaissance Error");
    } finally {
      setScanning(false);
    }
  };

  const getVerdictBadgeVariant = (level: VerdictLevel): "safe" | "low" | "medium" | "high" | "critical" => {
    if (level === "SAFE") return "safe";
    if (level === "LOW") return "low";
    if (level === "MEDIUM") return "medium";
    return "high";
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-primary-subtle text-primary text-[11px] font-mono font-bold mb-2">
          <Globe className="w-3.5 h-3.5" />
          <span>PASSIVE EXTERNAL EXPOSURE AUDIT</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          Defensive Passive Reconnaissance
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-3xl leading-relaxed">
          Assesses public digital exposure through non-intrusive DNS record analysis, TLS certificate handshakes, and defense-in-depth HTTP security headers. Zero aggressive probing or exploitation.
        </p>
      </div>

      {/* Target Search Form */}
      <Card level={1} className="p-6">
        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" />
            <input
              type="text"
              required
              placeholder="e.g. google.com, github.com, or enterprise-domain.org"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-0 border border-border text-xs text-text-primary placeholder:text-text-muted focus-ring font-mono transition"
            />
          </div>
          <Button
            type="submit"
            loading={scanning}
            loadingText="Inspecting Domain..."
            icon={<Search className="w-4 h-4" />}
          >
            Check Exposure
          </Button>
        </form>
        <p className="text-[11px] text-text-muted mt-2.5">
          NeuroCraft uses publicly observable signals only and complies with passive scanning best practices.
        </p>
      </Card>

      {/* Results View */}
      {reconData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Posture Banner */}
          <Card level={1} className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <Badge variant={getVerdictBadgeVariant(reconData.exposure_level)} size="md">
                    {reconData.exposure_level} EXPOSURE
                  </Badge>
                  <span className="text-xs font-mono text-text-muted">Domain Target</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-mono text-text-primary">
                  {reconData.target}
                </h3>
                <p className="text-xs text-text-secondary">
                  Assessment finished with zero invasive port-scanning.
                </p>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <ScoreRing
                  score={reconData.exposure_score}
                  size={120}
                  strokeWidth={10}
                  label="EXPOSURE SCORE"
                />
              </div>
            </div>
          </Card>

          {/* Category Tabs & Data Inspector */}
          <Card level={1} className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-3">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Observable Exposure Categories
              </h4>
              <Tabs
                size="sm"
                activeId={activeCategoryTab}
                onChange={setActiveCategoryTab}
                items={[
                  { id: "dns", label: "DNS Records", badge: reconData.dns_records.length },
                  { id: "tls", label: "TLS Handshake" },
                  { id: "headers", label: "Security Headers" },
                ]}
              />
            </div>

            {/* DNS Tab */}
            {activeCategoryTab === "dns" && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {reconData.dns_records.map((r, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-surface-0 border border-border text-xs flex items-center justify-between font-mono"
                  >
                    <span className="px-2 py-0.5 rounded bg-primary-subtle text-primary text-[10px] font-bold">
                      {r.record_type}
                    </span>
                    <span className="text-text-primary truncate max-w-sm" title={r.value}>
                      {r.value}
                    </span>
                    <span className="text-[11px] text-text-muted">TTL {r.ttl}</span>
                  </div>
                ))}
              </div>
            )}

            {/* TLS Tab */}
            {activeCategoryTab === "tls" && (
              <div className="space-y-3 text-xs">
                {reconData.tls_info ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-surface-0 border border-border space-y-1">
                      <span className="text-text-muted text-[11px]">Subject CN</span>
                      <div className="font-mono text-text-primary">{reconData.tls_info.subject}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-0 border border-border space-y-1">
                      <span className="text-text-muted text-[11px]">Issuer Authority</span>
                      <div className="font-mono text-text-primary">{reconData.tls_info.issuer}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-surface-0 border border-border space-y-1">
                        <span className="text-text-muted text-[11px]">Protocol</span>
                        <div className="font-mono text-text-primary font-bold">{reconData.tls_info.tls_version}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-0 border border-border space-y-1">
                        <span className="text-text-muted text-[11px]">Cipher Suite</span>
                        <div className="font-mono text-text-primary text-[11px] truncate">{reconData.tls_info.cipher_suite}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-text-muted text-xs">
                    No TLS handshake response captured on port 443.
                  </div>
                )}
              </div>
            )}

            {/* Headers Tab */}
            {activeCategoryTab === "headers" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-surface-0 border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-text-primary">HSTS</div>
                    <div className="text-[10px] text-text-muted">Strict Transport</div>
                  </div>
                  <Badge variant={reconData.security_headers?.hsts ? "safe" : "high"} size="sm">
                    {reconData.security_headers?.hsts ? "PRESENT" : "MISSING"}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-0 border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-text-primary">CSP</div>
                    <div className="text-[10px] text-text-muted">Content Policy</div>
                  </div>
                  <Badge variant={reconData.security_headers?.csp ? "safe" : "high"} size="sm">
                    {reconData.security_headers?.csp ? "PRESENT" : "MISSING"}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-0 border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-text-primary">X-Frame</div>
                    <div className="text-[10px] text-text-muted">Framing Guard</div>
                  </div>
                  <Badge variant={reconData.security_headers?.x_frame_options ? "safe" : "low"} size="sm">
                    {reconData.security_headers?.x_frame_options ? "CONFIGURED" : "MISSING"}
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-0 border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-text-primary">nosniff</div>
                    <div className="text-[10px] text-text-muted">MIME Sniffing</div>
                  </div>
                  <Badge variant={reconData.security_headers?.x_content_type_options ? "safe" : "low"} size="sm">
                    {reconData.security_headers?.x_content_type_options ? "CONFIGURED" : "MISSING"}
                  </Badge>
                </div>
              </div>
            )}
          </Card>

          {/* Actionable Remediations */}
          <Card level={2} className="p-6 space-y-3">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-theme-warning" />
              <span>Recommended Remediations ({reconData.findings.length})</span>
            </h4>

            {reconData.findings.length === 0 ? (
              <div className="py-4 text-center text-xs text-theme-success font-semibold">
                No active exposure deficiencies detected.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {reconData.findings.map((f) => (
                  <div key={f.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="font-bold text-text-primary">{f.title}</div>
                      <div className="text-text-secondary mt-0.5 leading-relaxed">{f.recommendation}</div>
                    </div>
                    <Badge variant={f.severity === "HIGH" ? "high" : "medium"} size="sm">
                      {f.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
