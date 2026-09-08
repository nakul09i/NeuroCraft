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
  Layers,
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
      name: "Legitimate Baseline",
      desc: "Clean quantum channel transmitting maximally entangled Bell-state pairs |Φ+>",
      badge: "EPR Entangled",
    },
    {
      id: "FORGERY",
      name: "Signature Forgery",
      desc: "Adversary applied unauthorized Ry(π/4) unitary transformation tampering with encoded state",
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
      desc: "Classical unentangled separable state |0>⊗|0> submitted without EPR correlation",
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
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Violet-Accented Neo-Brutalist Banner */}
      <div className="p-6 sm:p-7 rounded-xl border-2 border-border bg-surface-0 shadow-brutal space-y-3 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-accent-purple text-white border border-border">
              <Atom className="w-4 h-4 stroke-[2.5]" />
            </span>
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-accent-purple">
              BELL-STATE VERIFICATION SIMULATOR
            </span>
          </div>
          <Badge variant="quantum" size="sm">EPR CHANNEL ACTIVE</Badge>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display uppercase">
            QUANTUM TRUST SIMULATION
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-3xl leading-relaxed">
            Verify whether observed communication behavior matches the expected Bell-state entanglement distribution.
            Detects forgery, replay attacks, and channel interception by measuring Total Variation Distance (TVD).
          </p>
        </div>
      </div>

      {/* Scenario Configuration Card */}
      <Card level={0} className="p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3 border-b-2 border-border pb-2">
            <label className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider">
              CONFIGURE ATTACK / CHANNEL SCENARIO
            </label>
            <span className="text-[10px] font-mono text-text-muted font-bold">5 SIMULATED VECTORS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {scenariosList.map((sc) => {
              const isSelected = scenario === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setScenario(sc.id as QuantumScenario)}
                  className={`p-3.5 rounded-lg text-left transition-all border-2 ${
                    isSelected
                      ? "bg-accent-purple text-white border-border shadow-brutal-sm -translate-x-0.5 -translate-y-0.5 font-bold"
                      : "bg-surface-1 border-border text-text-primary hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-extrabold font-display truncate">{sc.name}</span>
                  </div>
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border font-extrabold ${
                      isSelected
                        ? "bg-black text-white border-black"
                        : "bg-surface-0 text-accent-purple border-accent-purple"
                    }`}
                  >
                    {sc.badge}
                  </span>
                  <p
                    className={`text-[10px] mt-2 line-clamp-2 leading-tight ${
                      isSelected ? "text-white/90" : "text-text-muted"
                    }`}
                  >
                    {sc.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders and Run Simulation CTA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t-2 border-border items-center">
          <div>
            <div className="flex items-center justify-between text-xs font-mono font-bold text-text-primary mb-1.5">
              <span>PROJECTIVE SHOTS</span>
              <span className="text-accent-purple font-extrabold">{shots}</span>
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
            <div className="flex items-center justify-between text-xs font-mono font-bold text-text-primary mb-1.5">
              <span>THERMAL NOISE LEVEL</span>
              <span className="text-accent-purple font-extrabold">
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
              loadingText="SIMULATING..."
              variant="quantum"
              className="w-full sm:w-auto text-xs font-black uppercase tracking-wider shadow-brutal"
              icon={<Play className="w-4 h-4 stroke-[2.5]" />}
            >
              RUN SIMULATION →
            </Button>
          </div>
        </div>
      </Card>

      {/* Simulation Results & Visualizations */}
      {simResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Verdict Banner: PASS / FAIL / INCONCLUSIVE */}
          <Card
            level={0}
            className={`p-6 sm:p-7 border-2 border-border ${
              verdict.startsWith("PASS")
                ? "bg-theme-success-subtle shadow-brutal"
                : verdict === "INCONCLUSIVE"
                ? "bg-theme-warning-subtle shadow-brutal"
                : "bg-theme-danger-subtle shadow-brutal"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3.5 rounded-lg border-2 border-border shadow-brutal-sm ${
                    verdict.startsWith("PASS")
                      ? "bg-theme-success text-black"
                      : verdict === "INCONCLUSIVE"
                      ? "bg-warning text-black"
                      : "bg-danger text-white"
                  }`}
                >
                  {verdict.startsWith("PASS") ? (
                    <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
                  ) : verdict === "INCONCLUSIVE" ? (
                    <HelpCircle className="w-8 h-8 stroke-[2.5]" />
                  ) : (
                    <ShieldAlert className="w-8 h-8 stroke-[2.5]" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2 text-[10px] font-mono font-extrabold uppercase text-text-muted">
                    <span>EPR VERIFICATION RESULT</span>
                    <span>·</span>
                    <span className="text-text-primary font-bold">{simResult.environment_badge}</span>
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black font-display text-text-primary tracking-tight mt-0.5">
                    {verdict}
                  </h3>
                  <div className="text-xs font-mono font-bold text-text-secondary mt-1">
                    {simResult.verdict}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-6 border-t-2 sm:border-t-0 sm:border-l-2 border-border pt-4 sm:pt-0 sm:pl-6 text-center">
                <div className="p-3 bg-surface-0 border-2 border-border rounded-lg shadow-[2px_2px_0px_var(--border)]">
                  <div className="text-2xl font-black font-mono text-text-primary">
                    {(simResult.deviation * 100).toFixed(2)}%
                  </div>
                  <div className="text-[9px] font-mono uppercase font-bold text-text-muted mt-0.5">
                    OBSERVED TVD
                  </div>
                </div>

                <div className="p-3 bg-surface-0 border-2 border-border rounded-lg shadow-[2px_2px_0px_var(--border)]">
                  <div className="text-2xl font-black font-mono text-text-muted">
                    {(simResult.threshold * 100).toFixed(1)}%
                  </div>
                  <div className="text-[9px] font-mono uppercase font-bold text-text-muted mt-0.5">
                    TOLERANCE BOUND
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Side-by-Side Distribution Chart: Expected vs Observed */}
          <Card level={0} className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <div>
                <h4 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider">
                  BELL-STATE COMPUTATIONAL BASIS PROJECTION: EXPECTED VS OBSERVED
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Expected Bell State |Φ+⟩ = (|00⟩ + |11⟩)/√2 vs Observed Projective Measurement
                </p>
              </div>
              <Badge variant="quantum" size="sm">
                {shots} SHOTS
              </Badge>
            </div>

            <div className="h-64 w-full pt-4 font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="state" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface-0)",
                      borderColor: "var(--border)",
                      borderWidth: "2px",
                      boxShadow: "4px 4px 0px var(--border)",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      color: "var(--text-primary)",
                    }}
                    formatter={(val: number) => [`${(val * 100).toFixed(2)}%`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                  <Bar dataKey="Expected" fill="var(--primary)" name="Expected (|Φ+⟩)" />
                  <Bar dataKey="Observed" fill="#a855f7" name="Observed Projection" />
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
              <h4 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider flex items-center space-x-2">
                <Info className="w-4 h-4 text-accent-purple stroke-[2.5]" />
                <span>WHY THIS RESULT?</span>
              </h4>
              <button className="p-1 rounded border border-border text-text-primary hover:bg-surface-2">
                {showWhyResult ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showWhyResult && (
              <div className="p-4 rounded-lg bg-surface-1 border-2 border-border text-xs leading-relaxed text-text-secondary font-sans animate-fadeIn">
                <div className="font-bold text-text-primary mb-1 font-display text-sm">
                  {verdict.startsWith("PASS")
                    ? "Channel Intact: Quantum Non-Locality Preserved"
                    : "Channel Perturbation Detected: Entanglement Collapsed"}
                </div>
                {simResult.explanation}
              </div>
            )}
          </Card>

          {/* Expandable: TECHNICAL EXPLANATION (Understandable for Hackathon Judges) */}
          <Card level={0} className="p-6 space-y-3">
            <div
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <h4 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-primary stroke-[2.5]" />
                <span>TECHNICAL EXPLANATION (FOR HACKATHON EVALUATORS)</span>
              </h4>
              <button className="p-1 rounded border border-border text-text-primary hover:bg-surface-2">
                {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showTechnicalDetails && (
              <div className="p-4 rounded-lg bg-surface-1 border-2 border-border font-mono text-[11px] text-text-secondary space-y-2 animate-fadeIn">
                <div className="font-bold text-text-primary border-b border-border pb-1">
                  1. MATHEMATICAL FORMULATION
                </div>
                <div>Bell Entangled Statevector: |ψ⟩ = 1/√2 (|00⟩ + |11⟩)</div>
                <div>{"Total Variation Distance (TVD): δ(P, Q) = 1/2 ∑_{x} |P(x) - Q(x)| = " + (simResult.deviation * 100).toFixed(3) + "%"}</div>
                <div>{"Hypothesis Threshold ε: " + (simResult.threshold * 100).toFixed(1) + "%"}</div>

                <div className="font-bold text-text-primary border-b border-border pt-2 pb-1">
                  2. CYBERSECURITY RELEVANCE
                </div>
                <div>
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
