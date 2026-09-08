import React, { useState } from "react";
import {
  Globe,
  Search,
  AlertCircle,
  ShieldCheck,
  Server,
  Lock,
  ArrowRight,
  Shield,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing } from "../ui/ScoreRing";
import { Tabs } from "../ui/Tabs";
import { EmptyState } from "../ui/EmptyState";
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
    <div className="space-y-10 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* Header with explicit Badges */}
      <div className="p-8 sm:p-10 rounded-3xl neu-raised space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="safe" size="md">PASSIVE</Badge>
          <Badge variant="info" size="md">PUBLIC</Badge>
          <Badge variant="neutral" size="md">NON-INTRUSIVE</Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
          Understand your public exposure.
        </h1>
        <p className="text-[15px] sm:text-base text-text-secondary max-w-3xl leading-relaxed">
          Inspect public security hygiene through observable DNS records, TLS certificates, and defense-in-depth HTTP headers without active port probing.
        </p>
      </div>

      {/* Target Search Form */}
      <Card level={0} className="p-7">
        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3.5">
          <div className="relative flex-1">
            <Globe className="absolute left-4 top-3.5 w-5 h-5 text-text-muted" />
            <input
              type="text"
              required
              placeholder="example.com or enterprise-target.org"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl neu-inset text-[15px] font-mono text-text-primary placeholder:text-text-muted focus-ring transition"
            />
          </div>
          <Button
            type="submit"
            loading={scanning}
            loadingText="Inspecting…"
            size="lg"
            variant="primary"
            className="text-[15px] font-medium"
            icon={<Search className="w-5 h-5" />}
          >
            Check Exposure
          </Button>
        </form>
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[13px] text-text-muted">
          <span>Target compliance: Zero intrusive packets</span>
          <span className="font-mono text-[12px]">RFC-Compliant DNS/TLS Queries</span>
        </div>
      </Card>

      {/* Results View */}
      {reconData ? (
        <div className="space-y-7 animate-fadeIn">
          {/* Top Posture Banner */}
          <Card level={0} className="p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
              <div className="space-y-2.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start space-x-2.5">
                  <Badge variant={getVerdictBadgeVariant(reconData.exposure_level)} size="md">
                    {reconData.exposure_level} Exposure
                  </Badge>
                  <span className="text-[13px] text-text-muted">Public Footprint</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
                  {reconData.target}
                </h2>
                <p className="text-[14px] text-text-secondary">
                  Assessment finished: {reconData.dns_records.length} DNS records, TLS handshake verified.
                </p>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <ScoreRing
                  score={reconData.exposure_score}
                  variant="risk"
                  size={144}
                  strokeWidth={10}
                  label="Exposure Score"
                />
              </div>
            </div>
          </Card>

          {/* Results: DNS, TLS, HTTP, TECHNOLOGY, PUBLIC EXPOSURE */}
          <Card level={0} className="p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-4 gap-3">
              <h3 className="text-[16px] font-semibold uppercase tracking-wider text-text-muted">
                Analysis Categories
              </h3>
              <Tabs
                size="sm"
                activeId={activeCategoryTab}
                onChange={setActiveCategoryTab}
                items={[
                  { id: "dns", label: "DNS", badge: reconData.dns_records.length },
                  { id: "tls", label: "TLS" },
                  { id: "http", label: "HTTP Headers" },
                  { id: "tech", label: "Technology" },
                  { id: "exposure", label: "Public Exposure" },
                ]}
              />
            </div>

            {/* DNS Tab */}
            {activeCategoryTab === "dns" && (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {reconData.dns_records.map((r, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl neu-inset text-xs flex items-center justify-between font-mono"
                  >
                    <span className="px-2.5 py-1 rounded-lg neu-raised-sm text-text-primary text-[12px] font-semibold">
                      {r.record_type}
                    </span>
                    <span className="text-text-primary truncate max-w-md text-[13px]" title={r.value}>
                      {r.value}
                    </span>
                    <span className="text-[12px] text-text-muted">TTL {r.ttl}</span>
                  </div>
                ))}
              </div>
            )}

            {/* TLS Tab */}
            {activeCategoryTab === "tls" && (
              <div className="space-y-3.5 text-xs">
                {reconData.tls_info ? (
                  <div className="space-y-3.5">
                    <div className="p-4 rounded-2xl neu-inset space-y-1">
                      <span className="text-text-muted text-[12px]">Subject Common Name</span>
                      <div className="font-mono text-text-primary font-medium text-[14px]">{reconData.tls_info.subject}</div>
                    </div>
                    <div className="p-4 rounded-2xl neu-inset space-y-1">
                      <span className="text-text-muted text-[12px]">Issuing Certificate Authority</span>
                      <div className="font-mono text-text-primary font-medium text-[14px]">{reconData.tls_info.issuer}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-4 rounded-2xl neu-inset space-y-1">
                        <span className="text-text-muted text-[12px]">Protocol Version</span>
                        <div className="font-mono text-text-primary font-semibold text-[14px]">{reconData.tls_info.tls_version}</div>
                      </div>
                      <div className="p-4 rounded-2xl neu-inset space-y-1">
                        <span className="text-text-muted text-[12px]">Negotiated Cipher Suite</span>
                        <div className="font-mono text-text-primary text-[12px] truncate">{reconData.tls_info.cipher_suite}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-text-muted text-sm">
                    No TLS handshake response captured on port 443.
                  </div>
                )}
              </div>
            )}

            {/* HTTP Tab (Security Headers) */}
            {activeCategoryTab === "http" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-2xl neu-inset flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-text-primary text-[15px]">HSTS</div>
                    <div className="text-[12px] text-text-muted">Strict Transport</div>
                  </div>
                  <Badge variant={reconData.security_headers?.hsts ? "safe" : "high"} size="sm">
                    {reconData.security_headers?.hsts ? "Present" : "Missing"}
                  </Badge>
                </div>

                <div className="p-4 rounded-2xl neu-inset flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-text-primary text-[15px]">CSP</div>
                    <div className="text-[12px] text-text-muted">Content Policy</div>
                  </div>
                  <Badge variant={reconData.security_headers?.csp ? "safe" : "high"} size="sm">
                    {reconData.security_headers?.csp ? "Present" : "Missing"}
                  </Badge>
                </div>

                <div className="p-4 rounded-2xl neu-inset flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-text-primary text-[15px]">X-Frame</div>
                    <div className="text-[12px] text-text-muted">Framing Guard</div>
                  </div>
                  <Badge variant={reconData.security_headers?.x_frame_options ? "safe" : "low"} size="sm">
                    {reconData.security_headers?.x_frame_options ? "Configured" : "Missing"}
                  </Badge>
                </div>

                <div className="p-4 rounded-2xl neu-inset flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-text-primary text-[15px]">nosniff</div>
                    <div className="text-[12px] text-text-muted">MIME Guard</div>
                  </div>
                  <Badge variant={reconData.security_headers?.x_content_type_options ? "safe" : "low"} size="sm">
                    {reconData.security_headers?.x_content_type_options ? "Configured" : "Missing"}
                  </Badge>
                </div>
              </div>
            )}

            {/* Technology Tab */}
            {activeCategoryTab === "tech" && (
              <div className="p-5 rounded-2xl neu-inset space-y-4">
                <div className="text-[14px] font-semibold uppercase tracking-wider text-text-muted">
                  Detected Infrastructure Signals
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 font-mono text-xs">
                  <div className="p-4 neu-raised-sm rounded-xl">
                    <div className="text-[12px] text-text-muted">TLS Protocol</div>
                    <div className="font-semibold text-text-primary mt-1 text-[14px]">{reconData.tls_info?.tls_version || "Unknown"}</div>
                  </div>
                  <div className="p-4 neu-raised-sm rounded-xl">
                    <div className="text-[12px] text-text-muted">Name Servers</div>
                    <div className="font-semibold text-text-primary mt-1 text-[14px]">{reconData.dns_records.filter(r => r.record_type === "NS").length} Configured</div>
                  </div>
                  <div className="p-4 neu-raised-sm rounded-xl">
                    <div className="text-[12px] text-text-muted">Mail Exchangers</div>
                    <div className="font-semibold text-text-primary mt-1 text-[14px]">{reconData.dns_records.filter(r => r.record_type === "MX").length} Active</div>
                  </div>
                </div>
              </div>
            )}

            {/* Public Exposure Tab */}
            {activeCategoryTab === "exposure" && (
              <div className="space-y-3.5">
                <div className="p-5 rounded-2xl neu-inset">
                  <h4 className="text-[16px] font-semibold text-text-primary">
                    Public Attack Surface Assessment
                  </h4>
                  <p className="text-[14px] text-text-secondary mt-1">
                    Calculated from missing defense headers, plain HTTP redirection, and nameserver exposure.
                  </p>
                  <div className="mt-4 flex items-center space-x-3 text-[14px]">
                    <span className="text-text-muted">Exposure Score:</span>
                    <Badge variant={getVerdictBadgeVariant(reconData.exposure_level)} size="md">
                      {reconData.exposure_score} / 100
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Actionable Remediations */}
          <Card level={0} className="p-7 space-y-4">
            <h3 className="text-[16px] font-semibold text-text-primary flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span>Recommended Defensive Remediations ({reconData.findings.length})</span>
            </h3>

            {reconData.findings.length === 0 ? (
              <div className="py-4 text-center text-[14px] text-emerald-500 font-medium">
                ✓ Zero active exposure deficiencies detected.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {reconData.findings.map((f) => (
                  <div key={f.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-text-primary text-[14px]">{f.title}</div>
                      <div className="text-text-secondary mt-1 leading-relaxed text-[13px]">{f.recommendation}</div>
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
      ) : (
        <Card level={0} className="p-14">
          <EmptyState
            icon={<Globe className="w-10 h-10 text-text-muted" />}
            title="No exposure data yet"
            description="Check a domain to begin analyzing its public security posture."
            actionLabel="Check Domain"
            onAction={() => {
              const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
              if (inputEl) inputEl.focus();
            }}
          />
        </Card>
      )}
    </div>
  );
};
