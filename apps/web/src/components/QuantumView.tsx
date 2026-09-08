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
import { api } from "../api";
import { QuantumScenario, QuantumSimulationResponse } from "../types";

export const QuantumView: React.FC = () => {
  const [scenario, setScenario] = useState<QuantumScenario>("LEGITIMATE");
  const [shots, setShots] = useState(1024);
  const [noiseLevel, setNoiseLevel] = useState(0.0);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState<QuantumSimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scenariosList = [
    {
      id: "LEGITIMATE",
      name: "Legitimate Baseline",
      desc: "Clean quantum channel with entangled Bell-state pairs |Φ+>",
      badge: "EPR Entangled",
    },
    {
      id: "FORGERY",
      name: "Signature Forgery",
      desc: "Adversary applied unauthorized Ry(π/4) unitary state transformation",
      badge: "Unitary Anomaly",
    },
    {
      id: "REPLAY",
      name: "Replay Attack",
      desc: "Stale reinjected state exhibiting temporal environmental decoherence",
      badge: "Phase Damping",
    },
    {
      id: "IMPERSONATION",
      name: "Impersonation",
      desc: "Classical unentangled separable state |0>⊗|0> submitted",
      badge: "Zero Entanglement",
    },
    {
      id: "CHANNEL_MANIPULATION",
      name: "Intercept & Resend",
      desc: "Active eavesdropping collapsing states into a maximally mixed state",
      badge: "QBER 50%",
    },
  ];

  const handleRunSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runQuantumSimulation(scenario, shots, noiseLevel);
      setSimResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to execute simulation");
    } finally {
      setLoading(false);
    }
  };

  // Format data for Recharts
  const chartData = simResult
    ? ["00", "01", "10", "11"].map((state) => ({
        state: `|${state}⟩`,
        Expected: simResult.expected_distribution[state] || 0,
        Observed: simResult.observed_distribution[state] || 0,
      }))
    : [];

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="relative rounded-2xl p-6 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/40 text-purple-300 text-[11px] font-mono font-bold mb-3">
              <Atom className="w-3.5 h-3.5" />
              <span>SIH KEY DIFFERENTIATOR</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Quantum Trust Simulation Engine
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Detects signature forgery, replay attacks, and channel eavesdropping by measuring statistical Total Variation Distance (TVD) against maximally entangled Bell state distributions.
            </p>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 border border-purple-400/50 text-purple-200 text-xs font-mono font-bold tracking-wider shrink-0 shadow-sm">
            SIMULATED QUANTUM ENVIRONMENT
          </div>
        </div>
      </div>

      {/* Scenario Selector & Controls */}
      <div className="cyber-glow-card rounded-2xl p-6 border border-slate-800 space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
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
                      ? "bg-purple-500/15 border-purple-400 text-white shadow-md ring-1 ring-purple-400/30"
                      : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold">{sc.name}</span>
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700">
                      {sc.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                    {sc.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders and Run Action */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-800 items-center">
          {/* Shots Slider */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1.5">
              <span>Projective Measurement Shots</span>
              <span className="font-mono text-cyan-400 font-bold">{shots}</span>
            </div>
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={shots}
              onChange={(e) => setShots(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Noise Slider */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1.5">
              <span>Thermal Channel Noise Level</span>
              <span className="font-mono text-cyan-400 font-bold">
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
              className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Run Button */}
          <div className="flex justify-end">
            <button
              onClick={handleRunSimulation}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs tracking-wider shadow-lg transition disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{loading ? "Simulating Channel..." : "Execute Quantum Simulation"}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-400 text-xs">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Simulation Results & Visualizations */}
      {simResult && (
        <div className="space-y-6">
          {/* Verdict Banner */}
          <div
            className={`rounded-2xl p-6 border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              simResult.verdict === "NO ATTACK DETECTED"
                ? "bg-emerald-950/20 border-emerald-500/40"
                : "bg-rose-950/20 border-rose-500/40 shadow-rose-glow"
            }`}
          >
            <div className="flex items-center space-x-4">
              <div
                className={`p-3 rounded-xl border ${
                  simResult.verdict === "NO ATTACK DETECTED"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                }`}
              >
                {simResult.verdict === "NO ATTACK DETECTED" ? (
                  <ShieldCheck className="w-8 h-8" />
                ) : (
                  <ShieldAlert className="w-8 h-8" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Quantum Channel Verdict
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-purple-300">
                    {simResult.environment_badge}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white mt-0.5 tracking-wide">
                  {simResult.verdict}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-6 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 text-center">
              <div>
                <div className="text-2xl font-extrabold font-mono text-white">
                  {(simResult.deviation * 100).toFixed(2)}%
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                  Observed TVD
                </div>
              </div>

              <div>
                <div className="text-2xl font-extrabold font-mono text-slate-400">
                  {(simResult.threshold * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                  Threshold Bound
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Distribution Chart */}
          <div className="cyber-glow-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Bell State Computational Basis Projection
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Theoretical Bell State |Φ+⟩ = (|00⟩ + |11⟩)/√2 vs Observed Projective Measurement
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-400">
                {shots} Monte Carlo Shots
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="state" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                    formatter={(val: number) => [`${(val * 100).toFixed(2)}%`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="Expected" fill="#06b6d4" name="Expected (|Φ+⟩)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Observed" fill="#a855f7" name="Observed Projection" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Technical Physics Explanation */}
          <div className="cyber-glow-card rounded-2xl p-6 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>Quantum Mechanics & Statistical Explanation</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800 font-mono">
              {simResult.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
