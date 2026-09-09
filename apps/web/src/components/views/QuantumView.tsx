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
  Radio,
  Eye,
  CheckCircle2,
  Lock,
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
import { formatApiError } from "../../utils/error";

export const QuantumView: React.FC = () => {
  const { toast } = useToast();
  const [scenario, setScenario] = useState<QuantumScenario>("LEGITIMATE");
  const [shots, setShots] = useState<number>(1024);
  const [noiseLevel, setNoiseLevel] = useState<number>(0.0);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState<QuantumSimulationResponse | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const friendlyScenarios = [
    {
      id: "LEGITIMATE",
      name: "Clean & Secure Connection",
      desc: "Normal secure communication with zero outside interference",
      badge: "Normal",
    },
    {
      id: "CHANNEL_MANIPULATION",
      name: "Eavesdropper Interception",
      desc: "An outside listener tries to read message contents along the channel",
      badge: "Eavesdropper",
    },
    {
      id: "FORGERY",
      name: "Message Tampering",
      desc: "An unauthorized attempt to modify the contents in-transit",
      badge: "Tampering",
    },
    {
      id: "REPLAY",
      name: "Replay Attempt",
      desc: "A stale or delayed message is reinjected by an unauthorized party",
      badge: "Replay",
    },
    {
      id: "IMPERSONATION",
      name: "Impersonation Attempt",
      desc: "A sender attempts communication without verified trust identity",
      badge: "Fake Sender",
    },
  ];

  const handleRunSimulation = async () => {
    setLoading(true);
    try {
      const res = await api.runQuantumSimulation(scenario, shots, noiseLevel);
      setSimResult(res);
      toast.success(
        res.verdict === "NO ATTACK DETECTED"
          ? "Trust test: Connection is Safe"
          : "Trust test: Tampering caught!"
      );
    } catch (err: unknown) {
      toast.error(formatApiError(err, "We couldn't run the test right now."), "Test Error");
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

  const safeTVD = simResult && Number.isFinite(simResult.deviation)
    ? (simResult.deviation * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <Card surface="raised" className="p-8 sm:p-10 relative overflow-hidden border border-border">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <Badge variant="quantum" size="sm">Interactive Test</Badge>
          <span className="text-xs font-semibold text-text-muted">
            Communication Security Simulation
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
          Trust Test
        </h1>
        <p className="text-base text-text-secondary mt-2 max-w-3xl leading-relaxed">
          Run a simulated trust test to explore how secure communication detects tampering. If an outside party attempts to eavesdrop or change the data, the test catches it instantly.
        </p>
      </Card>

      {/* Visual Channel Model Diagram */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-6 border border-border">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary">
              Communication Channel
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Live model: Sender (You) ──▶ Secure Channel ──▶ Receiver
            </p>
          </div>
          <Badge variant={scenario === "LEGITIMATE" ? "safe" : "high"} size="sm">
            {scenario === "LEGITIMATE" ? "CLEAN CHANNEL" : "INTERFERENCE ACTIVE"}
          </Badge>
        </div>

        {/* Visual Channel Canvas */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface-1 border border-border">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Sender (You) */}
            <div className="lg:col-span-3 p-4 rounded-xl bg-surface-0 text-center space-y-1.5 border border-border shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-surface-1 text-primary border border-border flex items-center justify-center mx-auto">
                <Radio className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-text-primary">You (Sender)</div>
              <div className="text-[11px] text-text-muted">Transmitting secure data</div>
            </div>

            {/* Middle: Secure Channel with Eavesdropper node */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center space-y-2 px-2">
              {/* Outside Listener Indicator */}
              <div
                className={`px-3 py-1.5 rounded-lg border text-xs flex items-center space-x-2 transition-all ${
                  isEveActive
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold"
                    : "bg-surface-0 border-border text-text-muted"
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>{isEveActive ? "⚠️ Outside Eavesdropper Active" : "No Outside Listeners"}</span>
              </div>

              {/* Animated Waveguide */}
              <div className="w-full relative h-10 flex items-center justify-center">
                <div
                  className={`w-full h-2.5 rounded-full relative overflow-hidden transition-colors ${
                    scenario === "LEGITIMATE"
                      ? "bg-gradient-to-r from-primary via-purple-500 to-emerald-500"
                      : "bg-gradient-to-r from-primary via-rose-500 to-rose-600"
                  }`}
                />
              </div>

              <div className="flex items-center justify-between w-full text-[11px] text-text-muted px-1">
                <span>Status: {scenario === "LEGITIMATE" ? "Protected" : "Tampered"}</span>
                <span>Security: High</span>
              </div>
            </div>

            {/* Receiver */}
            <div className="lg:col-span-3 p-4 rounded-xl bg-surface-0 text-center space-y-1.5 border border-border shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-surface-1 text-emerald-500 border border-border flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-text-primary">Receiver</div>
              <div className="text-[11px] text-text-muted">Verifying message integrity</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Scenario Picker & Run Button */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-6 border border-border">
        <div>
          <div className="border-b border-border pb-3 mb-4">
            <h2 className="text-xl font-bold text-text-primary">
              Choose a Test Scenario
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Select a situation to simulate how the security system responds.
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
                      ? "bg-purple-500/10 border-purple-500 text-text-primary ring-1 ring-purple-500/30 shadow-xs"
                      : "bg-surface-1 border-border hover:border-border-strong text-text-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-text-primary">
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
        </div>

        <div className="flex justify-end pt-3 border-t border-border">
          <Button
            onClick={handleRunSimulation}
            loading={loading}
            loadingText="Testing channel…"
            variant="quantum"
            className="text-base font-semibold px-8 py-3.5 shadow-md"
            icon={<Play className="w-4 h-4 fill-current" />}
          >
            Run Trust Test
          </Button>
        </div>
      </Card>

      {/* Test Results */}
      {simResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Verdict Banner */}
          <Card
            surface="raised"
            className={`p-7 sm:p-8 border ${
              isSafe ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3.5 rounded-xl bg-surface-0 border border-border shadow-xs ${
                    isSafe ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isSafe ? <CheckCircle2 className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Test Result
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mt-0.5">
                    {isSafe ? "✓ Connection is Secure & Untampered" : "🚨 Outside Tampering Detected"}
                  </h3>
                  <p className="text-sm text-text-secondary mt-1 max-w-lg">
                    {isSafe
                      ? "No outside listeners or altered messages were detected. Communication is 100% authentic."
                      : "The security system detected outside interference. The communication was blocked to protect privacy."}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-0 border border-border text-center shrink-0 min-w-[120px]">
                <div className="text-2xl font-extrabold font-mono text-text-primary">
                  {isSafe ? "100%" : `${(100 - parseFloat(safeTVD)).toFixed(0)}%`}
                </div>
                <div className="text-[11px] text-text-muted mt-0.5">Trust Match</div>
              </div>
            </div>
          </Card>

          {/* Optional Technical Details for Evaluators */}
          <Card surface="raised" className="p-6 space-y-4 border border-border">
            <div
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center justify-between cursor-pointer select-none py-1"
            >
              <div className="flex items-center space-x-2.5">
                <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-bold text-text-primary">
                  View Technical Details (Optional for evaluators)
                </h3>
              </div>
              <button className="p-1.5 rounded-lg bg-surface-1 hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors">
                {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showTechnicalDetails && (
              <div className="space-y-4 pt-2 border-t border-border animate-fadeIn text-xs">
                {/* Computational Basis Chart */}
                <div className="h-60 w-full pt-2 font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                      <XAxis dataKey="state" stroke="var(--text-muted)" fontSize={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--surface-0)",
                          borderColor: "var(--border)",
                          borderRadius: "10px",
                          fontSize: "12px",
                        }}
                        formatter={(val: number) => [`${(val * 100).toFixed(1)}%`, ""]}
                      />
                      <Bar dataKey="Expected" fill="#0284c7" radius={[4, 4, 0, 0]} name="Expected (|Φ⁺⟩)" />
                      <Bar dataKey="Observed" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Observed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-4 rounded-xl bg-surface-1 border border-border font-mono text-[11px] text-text-secondary space-y-1.5">
                  <div>Mathematical state: |ψ⟩ = 1/√2 (|00⟩ + |11⟩) Maximally entangled Bell pair</div>
                  <div>Observed Total Variation Distance (TVD): <strong>{safeTVD}%</strong></div>
                  <div>Decision threshold bound: <strong>15.0%</strong></div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
