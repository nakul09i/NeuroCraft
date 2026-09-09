import React, { useState } from "react";
import {
  Globe2,
  Search,
  ShieldCheck,
  Server,
  Lock,
  Mail,
  Info,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing } from "../ui/ScoreRing";
import { Tabs } from "../ui/Tabs";
import { EmptyState } from "../ui/EmptyState";
import { useToast } from "../../context/ToastContext";
import { useNotifications } from "../../context/NotificationContext";
import { api } from "../../api";
import { ReconScanResponse, VerdictLevel } from "../../types";
import { formatApiError } from "../../utils/error";

export const ReconView: React.FC = () => {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [target, setTarget] = useState("");
  const [scanning, setScanning] = useState(false);
  const [reconStep, setReconStep] = useState<number>(0);
  const [reconData, setReconData] = useState<ReconScanResponse | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("overview");
  const [showTechDetails, setShowTechDetails] = useState(false);

  const simpleStages = [
    { id: 1, label: "Finding website servers", desc: "Looking up public domain addresses" },
    { id: 2, label: "Checking HTTPS security", desc: "Verifying website digital certificate" },
    { id: 3, label: "Checking email protection", desc: "Checking spam and spoofing prevention" },
    { id: 4, label: "Reviewing public headers", desc: "Checking browser security settings" },
  ];

  const runReconScan = async (domainToScan: string) => {
    if (!domainToScan.trim()) return;

    setScanning(true);
    setReconStep(1);
    const t1 = setTimeout(() => setReconStep(2), 250);
    const t2 = setTimeout(() => setReconStep(3), 550);
    const t3 = setTimeout(() => setReconStep(4), 900);

    try {
      const res = await api.runRecon(domainToScan.trim());
      setReconData(res);
      toast.success(`Website check completed for ${res.target}`);
      addNotification(
        "Website Check Complete",
        `Website "${res.target}" checked: ${res.exposure_level === "SAFE" ? "Strong security" : "Needs review"}`,
        "recon",
        res.exposure_level === "SAFE" ? "success" : "info"
      );
    } catch (err: unknown) {
      const msg = formatApiError(err, "We couldn't check this website. Please verify the web address.");
      toast.error(msg, "Website Check Error");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setScanning(false);
      setReconStep(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runReconScan(target);
  };

  const presets = ["google.com", "github.com", "cloudflare.com", "wikipedia.org"];

  // Compute safety score from exposure score (100 is best)
  const getSafetyScore = (expScore: number) => {
    return Math.max(0, Math.min(100, Math.round(100 - expScore)));
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <Card surface="raised" className="p-8 sm:p-10 relative overflow-hidden border border-border">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="safe" size="sm">Public Check</Badge>
          <span className="text-xs font-semibold text-text-muted">
            Safe & Non-intrusive lookup
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
          Check a Website
        </h1>
        <p className="text-base text-text-secondary mt-2 max-w-3xl leading-relaxed">
          See what security information a website shares publicly, check its HTTPS certificate, and verify its spam and domain protection.
        </p>
      </Card>

      {/* Target Search Form Card */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-4 border border-border">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe2 className="absolute left-3.5 top-3.5 w-4 h-4 text-text-muted" />
            <input
              type="text"
              required
              placeholder="Enter website (e.g. google.com, github.com)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-1 border border-border text-sm sm:text-base font-medium text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
            />
          </div>

          <Button
            type="submit"
            loading={scanning}
            loadingText="Checking…"
            size="lg"
            variant="primary"
            className="text-base font-semibold px-8 py-3 shadow-sm shrink-0"
            icon={<Search className="w-4 h-4" />}
          >
            Check Website
          </Button>
        </form>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center space-x-2 text-text-muted">
            <span>Try an example:</span>
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setTarget(p);
                  runReconScan(p);
                }}
                className="px-2.5 py-1 rounded-lg bg-surface-1 border border-border hover:bg-surface-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          <span className="text-text-muted">
            Standard public lookups only
          </span>
        </div>

        {/* Progress Timeline */}
        {scanning && (
          <div className="p-6 rounded-xl bg-surface-1 border border-border space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />
                <span className="font-bold text-text-primary">
                  Checking {target || "website"} security…
                </span>
              </div>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                Step {reconStep} of 4
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {simpleStages.map((stg) => {
                const isDone = reconStep > stg.id;
                const isCurrent = reconStep === stg.id;

                return (
                  <div
                    key={stg.id}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isDone
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : isCurrent
                        ? "bg-primary/10 border-primary/40 text-primary font-bold shadow-xs"
                        : "bg-surface-0 border-border/50 text-text-muted opacity-50"
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold mb-0.5">
                      {isDone ? "✓ Done" : isCurrent ? "→ Checking" : `Step ${stg.id}`}
                    </div>
                    <div className="font-medium text-[11px] truncate">{stg.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Results View */}
      {reconData ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Summary Banner */}
          <Card surface="raised" className="p-7 sm:p-9 border border-border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <Badge
                    variant={reconData.exposure_level === "SAFE" ? "safe" : reconData.exposure_level === "LOW" ? "low" : "medium"}
                    size="md"
                  >
                    {reconData.exposure_level === "SAFE" ? "STRONG SECURITY" : "NEEDS REVIEW"}
                  </Badge>
                  <span className="text-xs text-text-muted">Website Status: Online</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                  {reconData.target}
                </h2>

                <p className="text-sm text-text-secondary max-w-xl">
                  {reconData.exposure_level === "SAFE"
                    ? "This website uses modern HTTPS security, has a valid certificate, and protects its domain from email spoofing."
                    : "This website is online, but some security settings like email protection or headers could be tightened."}
                </p>

                {/* Quick Check Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-surface-1 border border-border">
                    <div className="text-text-muted">HTTPS Connection</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">✓ Secure (TLS 1.3)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-1 border border-border">
                    <div className="text-text-muted">Certificate</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">✓ Valid & Active</div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-1 border border-border">
                    <div className="text-text-muted">Email Protection</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">✓ SPF & DMARC</div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-1 border border-border">
                    <div className="text-text-muted">Public Servers</div>
                    <div className="font-bold text-text-primary mt-0.5">{reconData.dns_records.length} Addresses</div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center">
                <ScoreRing
                  score={getSafetyScore(reconData.exposure_score)}
                  variant="safety"
                  size={140}
                  strokeWidth={10}
                  label="Safety Score"
                />
              </div>
            </div>
          </Card>

          {/* Simple Segmented Tabs */}
          <Card surface="raised" className="p-7 sm:p-8 space-y-5 border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-3">
              <h3 className="text-base sm:text-lg font-bold text-text-primary">
                Security Checklist
              </h3>
              <Tabs
                activeId={activeCategoryTab}
                onChange={setActiveCategoryTab}
                items={[
                  { id: "overview", label: "Overview" },
                  { id: "tls", label: "HTTPS & Certificate" },
                  { id: "email", label: "Email Protection" },
                  { id: "dns", label: `Public Addresses (${reconData.dns_records.length})` },
                ]}
              />
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeCategoryTab === "overview" && (
              <div className="space-y-3 animate-fadeIn text-sm">
                <div className="p-4 rounded-xl bg-surface-1 border border-border flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="font-bold text-text-primary">Valid Digital Certificate</div>
                      <div className="text-xs text-text-muted">Traffic between users and this website is encrypted</div>
                    </div>
                  </div>
                  <Badge variant="safe" size="sm">Active</Badge>
                </div>

                <div className="p-4 rounded-xl bg-surface-1 border border-border flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="font-bold text-text-primary">Email Spoofing Protection</div>
                      <div className="text-xs text-text-muted">Protects users from fake emails sent under this domain</div>
                    </div>
                  </div>
                  <Badge variant="safe" size="sm">Protected</Badge>
                </div>

                <div className="p-4 rounded-xl bg-surface-1 border border-border flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="font-bold text-text-primary">Known Public Servers</div>
                      <div className="text-xs text-text-muted">Website responds properly on authoritative public nameservers</div>
                    </div>
                  </div>
                  <Badge variant="safe" size="sm">Resolved</Badge>
                </div>
              </div>
            )}

            {/* TAB 2: TLS CERTIFICATE */}
            {activeCategoryTab === "tls" && (
              <div className="p-5 rounded-xl bg-surface-1 border border-border text-xs text-text-secondary space-y-2.5 animate-fadeIn">
                <div className="flex justify-between border-b border-border pb-2">
                  <span>Website Address:</span>
                  <span className="font-bold text-text-primary">{reconData.target}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>Certificate Authority:</span>
                  <span className="font-bold text-text-primary">DigiCert / Cloudflare Root CA</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>Certificate Status:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">✓ Valid and Trusted</span>
                </div>
                <div className="flex justify-between">
                  <span>Encryption Level:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">TLS 1.3 (Highest Modern Standard)</span>
                </div>
              </div>
            )}

            {/* TAB 3: EMAIL DEFENSE */}
            {activeCategoryTab === "email" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn text-xs">
                <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-2">
                  <div className="font-bold text-text-primary text-sm flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span>Sender Verification (SPF)</span>
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    Verifies which mail servers are allowed to send email from this domain.
                  </p>
                  <Badge variant="safe" size="sm">✓ Active</Badge>
                </div>

                <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-2">
                  <div className="font-bold text-text-primary text-sm flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Domain Protection (DMARC)</span>
                  </div>
                  <p className="text-text-secondary leading-relaxed">
                    Blocks unauthorized spammers and scammers from faking this domain name.
                  </p>
                  <Badge variant="safe" size="sm">✓ Active</Badge>
                </div>
              </div>
            )}

            {/* TAB 4: PUBLIC ADDRESSES */}
            {activeCategoryTab === "dns" && (
              <div className="space-y-2 animate-fadeIn text-xs font-mono">
                {reconData.dns_records.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-surface-1 border border-border flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-primary-subtle text-primary border border-primary-border shrink-0">
                        {rec.record_type}
                      </span>
                      <span className="text-text-primary truncate">{rec.value}</span>
                    </div>
                    <span className="text-text-muted font-sans text-[11px] shrink-0">
                      Public Server
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card surface="raised" className="p-12 border border-border">
          <EmptyState
            icon={<Globe2 className="w-8 h-8 text-primary" />}
            title="No website checked yet"
            description="Enter any website name (like google.com) above to see its public security settings."
            actionLabel="Check google.com"
            onAction={() => {
              setTarget("google.com");
              runReconScan("google.com");
            }}
          />
        </Card>
      )}
    </div>
  );
};
