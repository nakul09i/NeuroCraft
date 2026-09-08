import React, { useState } from "react";
import {
  Atom,
  ShieldCheck,
  ShieldAlert,
  Play,
  RefreshCw,
  Info,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ScoreRing } from "../ui/ScoreRing";
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
  const [showDeepMath, setShowDeepMath] = useState(false);

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
          ? "Quantum channel verified — statistical deviation within tolerance."
          : "Attack detected — statistical Total Variation Distance exceeded threshold."
      );
    } catch (err: any) {
      toast.error(err.message || "Simulation execution failed", "Simulation Error");
    } finally {
      setLoading(false);
    }
  };

  const chartData = simResult
    ? ["00", "01", "10", "11"].map((state) => ({
        state: `|${state}⟩`,
        Expected: simResult.expected_distribution[state] || 0,
        Observed: simResult.observed_distribution[state] || 0,
      }))
    : [];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Visual Signature Banner */}
      <div className="relative rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-purple-950/30 via-surface-1 to-surface-1 border border-purple-500/30 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-[11px] font-mono font-bold mb-3">
              <Atom className="w-3.5 h-3.5" />
              <span>SIH KEY DIFFERENTIATOR</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              Quantum Trust Simulation Engine
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-1.5 max-w-2xl leading-relaxed">
              Test whether observed communication behavior matches the expected quantum pattern. Detects forgery, replay attacks, and eavesdropping by measuring Total Variation Distance (TVD) from Bell-state distributions.
            </p>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 border border-purple-400/40 text-purple-600 dark:text-purple-300 text-xs font-mono font-bold tracking-wider shrink-0 shadow-sm">
            SIMULATED QUANTUM ENVIRONMENT
          </div>
        </div>
      </div>

      {/* Scenario Selector & Controls */}
      <Card level={1} className="p-6 space-y-6">
        <div>
          <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-3">
            Select Attack / Channel Scenario
          </label>
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
                      ? "bg-purple-500/15 border-purple-500 shadow-sm ring-1 ring-purple-500/30"
                      : "bg-surface-0 border-border text-text-secondary hover:border-border-strong hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-text-primary">{sc.name}</span>
                  </div>
                  <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-surface-2 text-purple-600 dark:text-purple-300 border border-border">
                    {sc.badge}
                  </span>
                  <p className="text-[11px] text-text-muted line-clamp-2 mt-2 leading-tight">
                    {sc.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders and Run Action */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border items-center">
          <div>
            <div className="flex items-center justify-between text-xs text-text-primary font-medium mb-1.5">
              <span>Projective Measurement Shots</span>
              <span className="font-mono text-primary font-bold">{shots}</span>
            </div>
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={shots}
              onChange={(e) => setShots(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-text-primary font-medium mb-1.5">
              <span>Thermal Channel Noise Level</span>
              <span className="font-mono text-primary font-bold">
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
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleRunSimulation}
              loading={loading}
              loadingText="Simulating Channel..."
              icon={<Play className="w-4 h-4" />}
            >
              Run Quantum Simulation
            </Button>
          </div>
        </div>
      </Card>

      {/* Simulation Results & Visualizations */}
      {simResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Verdict Banner */}
          <Card
            level={1}
            className={`p-6 border ${
              simResult.verdict === "NO ATTACK DETECTED"
                ? "bg-theme-success-subtle border-theme-success-border"
                : "bg-theme-danger-subtle border-theme-danger-border"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3 rounded-xl border ${
                    simResult.verdict === "NO ATTACK DETECTED"
                      ? "bg-surface-0 border-theme-success-border text-theme-success"
                      : "bg-surface-0 border-theme-danger-border text-theme-danger"
                  }`}
                >
                  {simResult.verdict === "NO ATTACK DETECTED" ? (
                    <ShieldCheck className="w-8 h-8" />
                  ) : (
                    <ShieldAlert className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-xs font-mono font-bold text-text-muted uppercase">
                    <span>Quantum Verification Result</span>
                    <span>•</span>
                    <span className="text-purple-500 font-bold">{simResult.environment_badge}</span>
                  </div>
                  <h3 className="text-2xl font-black text-text-primary tracking-tight mt-0.5">
                    {simResult.verdict}
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-6 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-6 text-center">
                <div>
                  <div className="text-2xl font-black font-mono text-text-primary">
                    {(simResult.deviation * 100).toFixed(2)}%
                  </div>
                  <div className="text-[10px] uppercase font-bold text-text-muted mt-0.5">
                    Observed TVD
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-black font-mono text-text-muted">
                    {(simResult.threshold * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] uppercase font-bold text-text-muted mt-0.5">
                    Tolerance Bound
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Side-by-Side Distribution Chart */}
          <Card level={1} className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Bell State Computational Basis Projection
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Expected Bell State |Φ+⟩ = (|00⟩ + |11⟩)/√2 vs Observed Projective Measurement
                </p>
              </div>
              <span className="text-xs font-mono text-primary font-bold">
                {shots} Monte Carlo Shots
              </span>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="state" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface-elevated)",
                      borderColor: "var(--border)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "var(--text-primary)",
                    }}
                    formatter={(val: number) => [`${(val * 100).toFixed(2)}%`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="Expected" fill="var(--primary)" name="Expected (|Φ+⟩)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Observed" fill="#a855f7" name="Observed Projection" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Plain-Language Explanation */}
          <Card level={2} className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center space-x-2">
                <Info className="w-4 h-4 text-primary" />
                <span>Physical & Information-Theoretic Explanation</span>
              </h4>
              <button
                onClick={() => setShowDeepMath(!showDeepMath)}
                className="text-xs font-mono text-primary flex items-center space-x-1"
              >
                <span>{showDeepMath ? "Hide" : "View"} Mathematical Statevector</span>
                {showDeepMath ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <p className="text-xs leading-relaxed text-text-secondary bg-surface-0 p-4 rounded-xl border border-border font-sans">
              {simResult.explanation}
            </p>

            {showDeepMath && (
              <div className="p-4 rounded-xl bg-surface-0 border border-border font-mono text-[11px] text-text-muted space-y-2 animate-fadeIn">
                <div>Statevector: |ψ⟩ = 1/√2 (|00⟩ + |11⟩)</div>
                <div>Trace Distance: D(P, Q) = 1/2 ∑_x |P(x) - Q(x)| = {simResult.deviation}</div>
                <div>Configured Channel Tolerance: ε = {simResult.threshold}</div>
                <div>Status: {simResult.deviation > simResult.threshold ? "THRESHOLD EXCEEDED (Anomalous Disturbance)" : "BOUND SATISFIED (Channel Intact)"}</div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
