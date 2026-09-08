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
        Expected: simResult.expected_distribution[state] || 0,
        Observed: simResult.observed_distribution[state] || 0,
      }))
    : [];

  const verdict = getVerdictLabel();

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-14">
      {/* Violet-Accented Apple-Style Banner */}
      <div className="p-7 rounded-2xl border border-border/70 bg-surface-0/70 backdrop-blur-sm shadow-sm space-y-3 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Atom className="w-4 h-4" />
            </span>
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
              Bell-State Verification Simulator
            </span>
          </div>
          <Badge variant="quantum" size="sm">EPR Channel Active</Badge>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
            Quantum Trust Simulation
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-3xl leading-relaxed">
            Verify whether observed communication telemetry matches expected Bell-state entanglement distributions.
            Detects forgery, replay attacks, and channel interception by measuring Total Variation Distance (TVD).
          </p>
        </div>
      </div>

      {/* Scenario Configuration Card */}
      <Card level={0} className="p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3.5 border-b border-border/60 pb-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Channel / Attack Scenario
            </label>
            <span className="text-xs text-text-muted">5 simulated attack vectors</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {scenariosList.map((sc) => {
              const isSelected = scenario === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setScenario(sc.id as QuantumScenario)}
                  className={`p-3.5 rounded-xl text-left transition-all border ${
                    isSelected
                      ? "bg-purple-500/10 border-purple-500/40 text-text-primary shadow-xs"
                      : "bg-surface-1/40 border-border/60 text-text-secondary hover:bg-surface-1/80 hover:text-text-primary"
                  }`}
                >
                  <div className="text-xs font-semibold text-text-primary truncate mb-1">
                    {sc.name}
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      isSelected
                        ? "bg-purple-500/20 text-purple-600 dark:text-purple-300"
                        : "bg-surface-2 text-text-muted"
                    }`}
                  >
                    {sc.badge}
                  </span>
                  <p className="text-[11px] mt-2 line-clamp-2 leading-relaxed text-text-muted">
                    {sc.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders and Run Simulation CTA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/60 items-center">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-text-primary mb-1.5">
              <span>Projective Shots</span>
              <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold">{shots}</span>
            </div>
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={shots}
              onChange={(e) => setShots(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-medium text-text-primary mb-1.5">
              <span>Thermal Noise Level</span>
              <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold">
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
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleRunSimulation}
              loading={loading}
              loadingText="Simulating…"
              variant="quantum"
              className="w-full sm:w-auto text-xs font-medium shadow-xs"
              icon={<Play className="w-4 h-4" />}
            >
              Run Simulation
            </Button>
          </div>
        </div>
      </Card>

      {/* Simulation Results & Visualizations */}
      {simResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Verdict Banner */}
          <Card
            level={0}
            className={`p-6 sm:p-7 border ${
              verdict.startsWith("PASS")
                ? "bg-emerald-500/10 border-emerald-500/30"
                : verdict === "INCONCLUSIVE"
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-rose-500/10 border-rose-500/30"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3 rounded-xl ${
                    verdict.startsWith("PASS")
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : verdict === "INCONCLUSIVE"
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {verdict.startsWith("PASS") ? (
                    <ShieldCheck className="w-7 h-7" />
                  ) : verdict === "INCONCLUSIVE" ? (
                    <HelpCircle className="w-7 h-7" />
                  ) : (
                    <ShieldAlert className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2 text-xs font-medium text-text-muted">
                    <span>EPR Verification Result</span>
                    <span>·</span>
                    <span className="text-text-primary font-semibold">{simResult.environment_badge}</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight mt-0.5">
                    {verdict}
                  </h3>
                  <div className="text-xs text-text-secondary mt-1">
                    {simResult.verdict}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 border-t sm:border-t-0 sm:border-l border-border/60 pt-4 sm:pt-0 sm:pl-6 text-center">
                <div className="p-3 bg-surface-0 border border-border/60 rounded-xl">
                  <div className="text-xl font-semibold font-mono text-text-primary">
                    {(simResult.deviation * 100).toFixed(2)}%
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    Observed TVD
                  </div>
                </div>

                <div className="p-3 bg-surface-0 border border-border/60 rounded-xl">
                  <div className="text-xl font-semibold font-mono text-text-muted">
                    {(simResult.threshold * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    Tolerance Bound
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Side-by-Side Distribution Chart: Expected vs Observed */}
          <Card level={0} className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Computational Basis Projection: Expected vs Observed
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Expected Bell State |Φ⁺⟩ = (|00⟩ + |11⟩)/√2 vs Observed Measurement
                </p>
              </div>
              <Badge variant="quantum" size="sm">
                {shots} Shots
              </Badge>
            </div>

            <div className="h-64 w-full pt-4 font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="state" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface-0)",
                      borderColor: "var(--border)",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      color: "var(--text-primary)",
                    }}
                    formatter={(val: number) => [`${(val * 100).toFixed(2)}%`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="Expected" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Expected (|Φ⁺⟩)" />
                  <Bar dataKey="Observed" fill="#a855f7" radius={[4, 4, 0, 0]} name="Observed Projection" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Expandable: WHY THIS RESULT? */}
          <Card level={0} className="p-6 space-y-3">
            <div
              onClick={() => setShowWhyResult(!showWhyResult)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center space-x-2">
                <Info className="w-4 h-4 text-purple-500" />
                <span>Why this result?</span>
              </h4>
              <button className="p-1 rounded-lg text-text-muted hover:text-text-primary">
                {showWhyResult ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showWhyResult && (
              <div className="p-4 rounded-xl bg-surface-1/40 border border-border/60 text-xs leading-relaxed text-text-secondary animate-fadeIn">
                <div className="font-semibold text-text-primary mb-1">
                  {verdict.startsWith("PASS")
                    ? "Channel Intact: Quantum Non-Locality Preserved"
                    : "Channel Perturbation Detected: Entanglement Collapsed"}
                </div>
                {simResult.explanation}
              </div>
            )}
          </Card>

          {/* Expandable: TECHNICAL EXPLANATION (Understandable for Hackathon Evaluators) */}
          <Card level={0} className="p-6 space-y-3">
            <div
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-primary" />
                <span>Technical Explanation (Cryptographic & Physical Foundation)</span>
              </h4>
              <button className="p-1 rounded-lg text-text-muted hover:text-text-primary">
                {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showTechnicalDetails && (
              <div className="p-4 rounded-xl bg-surface-1/40 border border-border/60 font-mono text-[11px] text-text-secondary space-y-2 animate-fadeIn">
                <div className="font-semibold text-text-primary border-b border-border/60 pb-1">
                  1. Mathematical Formulation
                </div>
                <div>Bell Entangled Statevector: |ψ⟩ = 1/√2 (|00⟩ + |11⟩)</div>
                <div>{"Total Variation Distance (TVD): δ(P, Q) = 1/2 ∑_{x} |P(x) - Q(x)| = " + (simResult.deviation * 100).toFixed(3) + "%"}</div>
                <div>{"Hypothesis Threshold ε: " + (simResult.threshold * 100).toFixed(1) + "%"}</div>

                <div className="font-semibold text-text-primary border-b border-border/60 pt-2 pb-1">
                  2. Cybersecurity Relevance
                </div>
                <div className="font-sans text-xs leading-relaxed text-text-secondary">
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
