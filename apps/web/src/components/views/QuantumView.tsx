import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  Cpu,
  Sparkles,
  Radio,
  Eye,
  CheckCircle2,
  Lock,
  Binary,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Accordion } from "../ui/Accordion";
import { useToast } from "../../context/ToastContext";
import { api } from "../../api";
import { QuantumScenario, QuantumSimulationResponse } from "../../types";
import { formatApiError } from "../../utils/error";

export const QuantumView: React.FC = () => {
  const { toast } = useToast();
  const [scenario, setScenario] = useState<QuantumScenario>("LEGITIMATE");
  const [shots, setShots] = useState<number>(1024);
  const [noiseLevel, setNoiseLevel] = useState<number>(0.0);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState<QuantumSimulationResponse | null>(null);

  const friendlyScenarios = [
    {
      id: "LEGITIMATE",
      name: "Clean & Untampered Channel",
      desc: "Baseline secure channel with zero active interference",
      badge: "Normal",
    },
    {
      id: "CHANNEL_MANIPULATION",
      name: "Eavesdropper Interception",
      desc: "Unauthorized observer measuring entangled states in transit",
      badge: "Interception",
    },
    {
      id: "FORGERY",
      name: "Message Tampering",
      desc: "Payload altered mid-transmission, collapsing quantum state",
      badge: "Tampering",
    },
    {
      id: "REPLAY",
      name: "Replay Attack",
      desc: "Out-of-sequence transmission attempt using recorded tokens",
      badge: "Replay",
    },
    {
      id: "IMPERSONATION",
      name: "Sender Impersonation",
      desc: "Unverified entity attempting transmission without valid identity",
      badge: "Impersonation",
    },
  ];

  const handleRunSimulation = async () => {
    setLoading(true);
    try {
      const res = await api.runQuantumSimulation(scenario, shots, noiseLevel);
      setSimResult(res);
      toast.success(
        res.verdict === "NO ATTACK DETECTED"
          ? "Verification passed: Channel is authentic"
          : "Verification alert: Interference detected"
      );
    } catch (err: unknown) {
      toast.error(formatApiError(err, "Simulation service unavailable."), "Simulation Error");
    } finally {
      setLoading(false);
    }
  };

  const isSafe = simResult ? simResult.verdict === "NO ATTACK DETECTED" : true;
  const isEveActive = scenario !== "LEGITIMATE";

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

  const safeTVD =
    simResult && Number.isFinite(simResult.deviation)
      ? (simResult.deviation * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6 page-enter max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Cryptographic Integrity
            </span>
            <span className="text-text-muted">•</span>
            <Badge variant="quantum" size="sm">Quantum-Inspired Simulation</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Trust Verification
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Verify whether files, cryptographic keys, and communication channels can be trusted against tampering.
          </p>
        </div>
      </div>

      {/* Visual Channel Model Diagram */}
      <Card surface="raised" className="p-6 sm:p-7 space-y-5 border border-border">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Verification Channel Architecture
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Sender (Ingestion) ──▶ Entangled Verification Channel ──▶ Receiver (Verification)
            </p>
          </div>
          <Badge variant={scenario === "LEGITIMATE" ? "safe" : "high"} size="sm">
            {scenario === "LEGITIMATE" ? "CHANNEL SECURE" : "ANOMALY INJECTED"}
          </Badge>
        </div>

        {/* Visual Channel Canvas */}
        <div className="p-6 rounded-xl bg-surface-1 border border-border">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Sender (You) */}
            <div className="lg:col-span-3 p-4 rounded-lg bg-surface-0 text-center space-y-1.5 border border-border">
              <div className="w-10 h-10 rounded-lg bg-surface-1 text-primary border border-border flex items-center justify-center mx-auto">
                <Radio className="w-5 h-5" />
              </div>
              <div className="font-semibold text-sm text-text-primary">Sender (Client)</div>
              <div className="text-[11px] text-text-muted">Transmitting state |ψ⟩</div>
            </div>

            {/* Middle: Secure Channel with Eavesdropper node */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center space-y-2.5 px-2">
              {/* Eavesdropper State Indicator */}
              <div
                className={`px-3 py-1 rounded-full border text-xs flex items-center space-x-2 transition-all ${
                  isEveActive
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-medium"
                    : "bg-surface-0 border-border text-text-muted"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="text-[11px]">{isEveActive ? "Observer Injected (Tampering Active)" : "No Channel Observers"}</span>
              </div>

              {/* Waveguide line */}
              <div className="w-full relative h-3 flex items-center justify-center">
                <div
                  className={`w-full h-1.5 rounded-full transition-colors duration-300 ${
                    scenario === "LEGITIMATE"
                      ? "bg-gradient-to-r from-primary via-emerald-500 to-primary"
                      : "bg-gradient-to-r from-primary via-rose-500 to-rose-600"
                  }`}
                />
              </div>

              <div className="flex items-center justify-between w-full text-[11px] text-text-muted px-1 font-mono">
                <span>EPR Pair: |Φ⁺⟩</span>
                <span>Basis: Computational</span>
              </div>
            </div>

            {/* Receiver */}
            <div className="lg:col-span-3 p-4 rounded-lg bg-surface-0 text-center space-y-1.5 border border-border">
              <div className="w-10 h-10 rounded-lg bg-surface-1 text-emerald-500 border border-border flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="font-semibold text-sm text-text-primary">Receiver (Target)</div>
              <div className="text-[11px] text-text-muted">Measuring fidelity</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Scenario Picker & Run Simulation */}
      <Card surface="raised" className="p-6 sm:p-7 space-y-5 border border-border">
        <div className="border-b border-border pb-3">
          <h2 className="text-base font-semibold text-text-primary">
            Select Simulation Scenario
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Test how post-quantum verification catches eavesdropping and message forgery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {friendlyScenarios.map((sc) => {
            const isSelected = scenario === sc.id;
            return (
              <div
                key={sc.id}
                onClick={() => setScenario(sc.id as QuantumScenario)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-primary/10 border-primary text-text-primary ring-1 ring-primary/30"
                    : "bg-surface-1 border-border hover:border-border-strong text-text-secondary"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-text-primary">
                    {sc.name}
                  </span>
                  <Badge variant={isSelected ? "quantum" : "neutral"} size="sm">
                    {sc.badge}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {sc.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-text-muted font-mono">
            Shots: 1,024 • Metric: TVD
          </span>

          <Button
            onClick={handleRunSimulation}
            loading={loading}
            loadingText="Verifying channel…"
            variant="primary"
            className="font-semibold px-6 py-2.5"
            icon={<Play className="w-4 h-4 fill-current" />}
          >
            Run Trust Verification
          </Button>
        </div>
      </Card>

      {/* Test Results */}
      {simResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Primary Result Card */}
          <Card
            surface="raised"
            className={`p-6 sm:p-7 border ${
              isSafe ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3 rounded-xl bg-surface-0 border border-border shadow-xs ${
                    isSafe ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isSafe ? <CheckCircle2 className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
                </div>

                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Verification Verdict
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mt-0.5">
                    {isSafe ? "Channel Verified — 100% Authentic" : "State Perturbation Detected"}
                  </h3>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-lg">
                    {isSafe
                      ? "Zero channel disturbance detected. Quantum fidelity matches theoretical Bell pair bounds."
                      : "Total variation distance exceeded security thresholds. Quantum entanglement collapsed due to outside interference."}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-0 border border-border text-center shrink-0 min-w-[130px]">
                <div className="text-2xl font-bold font-mono text-text-primary">
                  {isSafe ? "100%" : `${Math.max(0, Math.round(100 - parseFloat(safeTVD)))}%`}
                </div>
                <div className="text-[11px] text-text-muted mt-0.5">Fidelity Rating</div>
              </div>
            </div>
          </Card>

          {/* Progressive Disclosure: Accordion for Technical Quantum State */}
          <Accordion
            icon={<Binary className="w-4 h-4 text-primary" />}
            title="Computational Basis Distribution (|00⟩, |01⟩, |10⟩, |11⟩)"
            subtitle="Observed measurement probabilities vs. theoretical Bell state |Φ⁺⟩ = 1/√2 (|00⟩ + |11⟩)"
            badge={<Badge variant="neutral" size="sm">TVD: {safeTVD}%</Badge>}
            defaultOpen={false}
          >
            <div className="space-y-4 pt-1">
              <div className="h-60 w-full font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis dataKey="state" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--surface-0)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(val: number) => [`${(val * 100).toFixed(1)}%`, ""]}
                    />
                    <Bar dataKey="Expected" fill="#0284c7" radius={[4, 4, 0, 0]} name="Expected (|Φ⁺⟩)" />
                    <Bar dataKey="Observed" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Observed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3.5 rounded-lg bg-surface-0 border border-border font-mono text-[11px] text-text-secondary space-y-1">
                <div>Theoretical State: |ψ⟩ = 1/√2 (|00⟩ + |11⟩)</div>
                <div>Observed Variation Distance (TVD): <strong className="text-text-primary">{safeTVD}%</strong></div>
                <div>Permissible Noise Threshold: <strong className="text-text-primary">15.0%</strong></div>
              </div>
            </div>
          </Accordion>
        </div>
      )}
    </div>
  );
};
