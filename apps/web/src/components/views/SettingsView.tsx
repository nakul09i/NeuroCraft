import React from "react";
import {
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useTheme, ThemeMode } from "../../context/ThemeContext";
import { UserProfile } from "../../types";

export interface SettingsViewProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onOpenAuth,
  onLogout,
}) => {
  const { theme, setTheme } = useTheme();

  const themeOptions: Array<{ id: ThemeMode; label: string; desc: string; icon: any }> = [
    {
      id: "light",
      label: "Light",
      desc: "Warm neutral light theme with soft layered shadows and charcoal text",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark",
      desc: "Deep navy near-black theme with subtle cyan and violet accents",
      icon: Moon,
    },
    {
      id: "system",
      label: "System",
      desc: "Synchronize automatically with your operating system appearance",
      icon: Laptop,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-14">
      {/* Header Banner */}
      <div className="p-7 rounded-2xl border border-border/70 bg-surface-0/70 backdrop-blur-sm shadow-sm space-y-2">
        <div className="flex items-center space-x-2">
          <Badge variant="neutral" size="sm">System Preferences</Badge>
          <span className="text-xs text-text-muted">
            Persisted Configuration
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
          Application Settings
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Customize your interface appearance, manage session credentials, and inspect security guarantees.
        </p>
      </div>

      {/* Theme Selection */}
      <Card level={0} className="p-6 space-y-4">
        <div className="border-b border-border/60 pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Appearance & Interface Theme
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Persisted across browser sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`p-4 rounded-xl text-left border transition-all focus-ring ${
                  isSelected
                    ? "bg-primary/10 border-primary/40 text-text-primary shadow-xs"
                    : "bg-surface-1/40 border-border/60 text-text-secondary hover:bg-surface-1/80 hover:text-text-primary"
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-text-primary">
                    {opt.label}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-text-muted">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Account & Profile */}
      <Card level={0} className="p-6 space-y-4">
        <div className="border-b border-border/60 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Account & Identity
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Audit session credentials and tenant privileges.
            </p>
          </div>
          <Badge variant="safe" size="sm">Isolated</Badge>
        </div>

        {user ? (
          <div className="p-4 rounded-xl bg-surface-1/40 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-text-primary text-sm">
                {user.display_name || user.email}
              </div>
              <div className="text-text-muted font-mono">{user.email}</div>
              <div className="text-[11px] font-mono text-text-muted">Session ID: {user.id}</div>
            </div>

            <Button size="sm" variant="destructive" onClick={onLogout}>
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface-1/40 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-xs text-text-secondary">
              Operating in guest mode. Sign in to link security audit scans to your identity.
            </div>
            <Button size="sm" variant="primary" onClick={onOpenAuth}>
              Sign In / Register
            </Button>
          </div>
        )}
      </Card>

      {/* Architectural Guarantees */}
      <Card level={0} className="p-6 space-y-4">
        <div className="border-b border-border/60 pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Architectural & Privacy Invariants</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1">
            <div className="font-medium text-text-primary">Zero Dynamic Execution</div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Files uploaded to NeuroCraft are quarantined in memory and inspected strictly with deterministic parsers. Binaries are never executed.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1">
            <div className="font-medium text-text-primary">Quantum Channel Non-Locality</div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              All quantum trust calculations simulate Bell-state density matrix projections locally without relying on external cloud APIs.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1">
            <div className="font-medium text-text-primary">Free-First Open Source Stack</div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Zero mandatory paid vendor dependencies. Runs entirely self-contained with Python 3.11+ and standard cryptographic libraries.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-1/40 border border-border/60 space-y-1">
            <div className="font-medium text-text-primary">Evidence Transparency</div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Unsigned binaries are flagged for absence of Authenticode certificates, never blindly marked as malware without supporting evidence.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
