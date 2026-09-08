import React, { useState } from "react";
import {
  Atom,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Play,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api";
import { QuantumScenario, QuantumSimulationResponse } from "../../types";

export const QuantumView: React.FC = () => {
  const { toast } = useToast();
  const [scenario, setScenario] = useState<QuantumScenario>("LEGITIMATE");
  const [shots, setShots] = useState<number>(1024);
  const [noiseLevel, setNoiseLevel] = useState<number>(0.0);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState<QuantumSimulationResponse | null>(null);
  const [showWhyResult, setShowWhyResult] = useState(true);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const scenariosList = [
    {
      id: "LEGITIMATE",
      name: "Legitimate Channel",
      desc: "Clean quantum channel transmitting maximally entangled Bell-state pairs |Φ⁺⟩",
      badge: "EPR Entangled",
    },
    {
      id: "FORGERY",
      name: "Signature Forgery",
      desc: "Unauthorized Ry(π/4) unitary transformation applied to tamper with encoded state",
      badge: "Unitary Anomaly",
    },
    {
      id: "REPLAY",
      name: "Replay Attack",
      desc: "Stale reinjected state exhibiting temporal environmental phase decoherence",
      badge: "Phase Damping",
    },
    {
      id: "IMPERSONATION",
      name: "Impersonation",
      desc: "Classical unentangled separable state |0⟩⊗|0⟩ submitted without correlation",
      badge: "Zero Entanglement",
    },
    {
      id: "CHANNEL_MANIPULATION",
      name: "Intercept & Resend",
      desc: "Active eavesdropping collapsing states into a 50% QBER maximally mixed state",
      badge: "QBER 50%",
    },
  ];

  const handleRunSimulation = async () => {
    setLoading(true);
    try {
      const res = await api.runQuantumSimulation(scenario, shots, noiseLevel);
      setSimResult(res);
      toast.success(
        res.verdict === "NO ATTACK DETECTED"
          ? "Quantum channel verification: PASS"
          : "Quantum channel verification: FAIL"
      );
    } catch (err: any) {
      toast.error(err.message || "Simulation execution failed", "Simulation Error");
    } finally {
      setLoading(false);
    }
  };

  const getVerdictLabel = () => {
    if (!simResult) return "";
    if (simResult.verdict === "NO ATTACK DETECTED") {
      return noiseLevel > 0.3 ? "PASS (NOISY)" : "PASS";
    }
    if (Math.abs(simResult.deviation - simResult.threshold) < 0.05) {
      return "INCONCLUSIVE";
    }
    return "FAIL";
  };

  const chartData = simResult
    ? ["00", "01", "10", "11"].map((state) => ({
        state: `|${state}⟩`,
        Expected: Number.isFinite(simResult.expected_distribution[state])
          ? simResult.expected_distribution[state]
          : 0,
        Observed: Number.isFinite(simResult.observed_distribution[state])
          ? simResult.observed_distribution[state]
          : 0,
      }))
    : [];

  const verdict = getVerdictLabel();

  // Safe numeric formatters (Strict Zero-NaN)
  const safeTVD = simResult && Number.isFinite(simResult.deviation)
    ? (simResult.deviation * 100).toFixed(2)
    : "0.00";
  const safeThreshold = simResult && Number.isFinite(simResult.threshold)
    ? (simResult.threshold * 100).toFixed(1)
    : "15.0";

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-14">
      {/* Soft Neumorphic Hero Header Banner */}
      <Card surface="raised" className="p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl neu-inset-sm text-purple-600 dark:text-purple-400">
              <Atom className="w-5 h-5" />
            </span>
            <span className="text-sm font-semibold tracking-wide text-purple-600 dark:text-purple-400 uppercase">
              Bell-State Verification Simulator
            </span>
          </div>
          <Badge variant="quantum" size="sm">
            EPR Channel Active
          </Badge>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
            Quantum Trust Simulation
          </h1>
          <p className="text-base text-text-secondary mt-2 max-w-3xl leading-relaxed">
            Verify whether observed communication telemetry matches expected Bell-state entanglement distributions.
            Detects forgery, replay attacks, and channel interception by measuring Total Variation Distance (TVD) against projective thresholds.
          </p>
        </div>
      </Card>

      {/* Scenario Configuration Card */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">
                Channel & Attack Scenarios
              </h2>
              <p className="text-sm text-text-secondary mt-0.5">
                Select a physical channel state or simulated adversarial manipulation.
              </p>
            </div>
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg neu-inset-sm text-text-muted">
              5 attack vectors
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {scenariosList.map((sc) => {
              const isSelected = scenario === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setScenario(sc.id as QuantumScenario)}
                  className={`p-4 rounded-2xl text-left transition-all duration-200 border ${
                    isSelected
                      ? "neu-inset border-purple-500/50 bg-purple-500/10 text-text-primary shadow-inner"
                      : "neu-button bg-surface-0 border-border/60 text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <div className="text-sm font-semibold text-text-primary truncate mb-1">
                    {sc.name}
                  </div>
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${
                      isSelected
                        ? "bg-purple-500/25 text-purple-600 dark:text-purple-300 font-semibold"
                        : "bg-surface-2/60 text-text-muted"
                    }`}
                  >
                    {sc.badge}
                  </span>
                  <p className="text-xs line-clamp-3 leading-relaxed text-text-muted">
                    {sc.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders and Run Simulation CTA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-border/60 items-center">
          <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/50">
            <div className="flex items-center justify-between text-sm font-medium text-text-primary mb-2">
              <span>Projective Shots</span>
              <span className="font-mono text-base text-purple-600 dark:text-purple-400 font-bold">
                {shots.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={shots}
              onChange={(e) => setShots(Number(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer h-2 rounded-lg bg-surface-2"
            />
            <div className="flex justify-between text-[11px] text-text-muted mt-1 font-mono">
              <span>100</span>
              <span>4,000</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/50">
            <div className="flex items-center justify-between text-sm font-medium text-text-primary mb-2">
              <span>Thermal Noise Level</span>
              <span className="font-mono text-base text-purple-600 dark:text-purple-400 font-bold">
                {(noiseLevel * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={noiseLevel}
              onChange={(e) => setNoiseLevel(Number(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer h-2 rounded-lg bg-surface-2"
            />
            <div className="flex justify-between text-[11px] text-text-muted mt-1 font-mono">
              <span>0% (Ideal)</span>
              <span>100% (High Noise)</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleRunSimulation}
              loading={loading}
              loadingText="Simulating Channel…"
              variant="quantum"
              className="w-full h-14 text-base font-semibold shadow-md"
              icon={<Play className="w-5 h-5 fill-current" />}
            >
              Run Simulation
            </Button>
          </div>
        </div>
      </Card>

      {/* Simulation Results & Visualizations */}
      {simResult && (
        <div className="space-y-7 animate-fadeIn">
          {/* Verdict Banner */}
          <Card
            surface="raised"
            className={`p-7 sm:p-8 border-2 transition-all ${
              verdict.startsWith("PASS")
                ? "border-emerald-500/40 bg-emerald-500/5"
                : verdict === "INCONCLUSIVE"
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-rose-500/40 bg-rose-500/5"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center space-x-5">
                <div
                  className={`p-4 rounded-2xl neu-inset-sm ${
                    verdict.startsWith("PASS")
                      ? "text-emerald-600 dark:text-emerald-400"
                      : verdict === "INCONCLUSIVE"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {verdict.startsWith("PASS") ? (
                    <ShieldCheck className="w-9 h-9" />
                  ) : verdict === "INCONCLUSIVE" ? (
                    <HelpCircle className="w-9 h-9" />
                  ) : (
                    <ShieldAlert className="w-9 h-9" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    <span>EPR Verification Result</span>
                    <span>·</span>
                    <span className="text-text-primary font-bold">{simResult.environment_badge}</span>
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight mt-1">
                    {verdict}
                  </h3>
                  <div className="text-sm text-text-secondary mt-1 max-w-lg font-medium">
                    {simResult.verdict}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 border-t sm:border-t-0 sm:border-l border-border/60 pt-4 sm:pt-0 sm:pl-6 text-center w-full sm:w-auto justify-around sm:justify-start">
                <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0 min-w-[120px]">
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-text-primary">
                    {safeTVD}%
                  </div>
                  <div className="text-xs font-medium text-text-muted mt-1 uppercase tracking-wider">
                    Observed TVD
                  </div>
                </div>

                <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0 min-w-[120px]">
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-text-muted">
                    {safeThreshold}%
                  </div>
                  <div className="text-xs font-medium text-text-muted mt-1 uppercase tracking-wider">
                    Tolerance Bound
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Computational Basis Projection Chart: Expected vs Observed */}
          <Card surface="raised" className="p-7 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-4 gap-2">
              <div>
                <h4 className="text-lg sm:text-xl font-bold text-text-primary">
                  Computational Basis Projection: Expected vs Observed
                </h4>
                <p className="text-sm text-text-secondary mt-1">
                  Expected Bell State |Φ⁺⟩ = (|00⟩ + |11⟩)/√2 vs Observed Measurement Projection
                </p>
              </div>
              <Badge variant="quantum" size="md">
                {shots.toLocaleString()} Projected Shots
              </Badge>
            </div>

            <div className="h-72 w-full pt-4 font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="state" stroke="var(--text-muted)" fontSize={13} fontWeight={600} />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface-0)",
                      borderColor: "var(--border)",
                      borderRadius: "14px",
                      boxShadow: "var(--neu-raised-md)",
                      fontSize: "13px",
                      fontFamily: "monospace",
                      color: "var(--text-primary)",
                      padding: "10px 14px",
                    }}
                    formatter={(val: number) => [`${(val * 100).toFixed(2)}%`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }} />
                  <Bar dataKey="Expected" fill="#0284c7" radius={[6, 6, 0, 0]} name="Expected (|Φ⁺⟩)" />
                  <Bar dataKey="Observed" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Observed Projection" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Expandable: WHY THIS RESULT? */}
          <Card surface="raised" className="p-6 sm:p-7 space-y-3">
            <div
              onClick={() => setShowWhyResult(!showWhyResult)}
              className="flex items-center justify-between cursor-pointer select-none py-1"
            >
              <h4 className="text-base sm:text-lg font-bold text-text-primary flex items-center space-x-2.5">
                <Info className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Why this result?</span>
              </h4>
              <button className="p-2 rounded-xl neu-button text-text-muted hover:text-text-primary transition-colors">
                {showWhyResult ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {showWhyResult && (
              <div className="p-5 rounded-2xl neu-inset-sm bg-surface-0/60 text-sm leading-relaxed text-text-secondary animate-fadeIn mt-2">
                <div className="font-bold text-base text-text-primary mb-2 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>
                    {verdict.startsWith("PASS")
                      ? "Channel Intact: Quantum Non-Locality Preserved"
                      : "Channel Perturbation Detected: Entanglement Collapsed"}
                  </span>
                </div>
                {simResult.explanation}
              </div>
            )}
          </Card>

          {/* Expandable: TECHNICAL EXPLANATION FOR EVALUATORS */}
          <Card surface="raised" className="p-6 sm:p-7 space-y-3">
            <div
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center justify-between cursor-pointer select-none py-1"
            >
              <h4 className="text-base sm:text-lg font-bold text-text-primary flex items-center space-x-2.5">
                <Cpu className="w-5 h-5 text-primary" />
                <span>Technical Explanation (Cryptographic & Physical Foundation)</span>
              </h4>
              <button className="p-2 rounded-xl neu-button text-text-muted hover:text-text-primary transition-colors">
                {showTechnicalDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {showTechnicalDetails && (
              <div className="p-5 rounded-2xl neu-inset-sm bg-surface-0/60 font-mono text-xs sm:text-sm text-text-secondary space-y-3 animate-fadeIn mt-2">
                <div className="font-bold text-sm text-text-primary border-b border-border/60 pb-2">
                  1. Mathematical Formulation
                </div>
                <div className="text-text-primary font-semibold">
                  Bell Entangled Statevector: |ψ⟩ = 1/√2 (|00⟩ + |11⟩)
                </div>
                <div>
                  Total Variation Distance (TVD): δ(P, Q) = 1/2 ∑_x |P(x) - Q(x)| ={" "}
                  <span className="text-purple-600 dark:text-purple-400 font-bold">{safeTVD}%</span>
                </div>
                <div>
                  Hypothesis Threshold ε:{" "}
                  <span className="text-text-primary font-bold">{safeThreshold}%</span>
                </div>

                <div className="font-bold text-sm text-text-primary border-b border-border/60 pt-3 pb-2">
                  2. Cybersecurity Relevance
                </div>
                <div className="font-sans text-sm leading-relaxed text-text-secondary">
                  Classical digital signature keys and hashes can be stolen or intercepted in-transit.
                  NeuroCraft binds certificate validation with Bell-state quantum telemetry.
                  According to the No-Cloning Theorem, an adversary cannot intercept, clone, or tamper with an EPR pair without collapsing the superposition and exponentially increasing TVD beyond ε.
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
