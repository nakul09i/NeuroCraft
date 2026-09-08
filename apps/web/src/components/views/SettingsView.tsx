import React from "react";
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
  Lock,
  User,
  Cpu,
  Info,
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

  const themeOptions: Array<{ id: ThemeMode; label: string; symbol: string; desc: string; icon: any }> = [
    {
      id: "light",
      label: "Light Mode",
      symbol: "☀",
      desc: "Warm cream background (#F5F4EF) with high-contrast black borders",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark Mode",
      symbol: "☾",
      desc: "Deep near-black background (#08090A) with electric cyan accents",
      icon: Moon,
    },
    {
      id: "system",
      label: "System Mode",
      symbol: "◐",
      desc: "Synchronize automatically with your operating system preference",
      icon: Laptop,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="p-6 sm:p-7 rounded-xl border-2 border-border bg-surface-0 shadow-brutal space-y-2">
        <div className="flex items-center space-x-2">
          <Badge variant="neutral" size="sm">SYSTEM PREFERENCES</Badge>
          <span className="text-[10px] font-mono font-bold text-text-muted uppercase">
            PERSISTED CONFIGURATION
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-display uppercase">
          APPLICATION SETTINGS
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Customize your visual interface theme, manage authenticated identity, and review security invariants.
        </p>
      </div>

      {/* Theme Selection */}
      <Card level={0} className="p-6 space-y-4">
        <div className="border-b-2 border-border pb-3">
          <h3 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider">
            APPEARANCE & INTERFACE THEME
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Persisted automatically across browser sessions.
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
                className={`p-4 rounded-lg text-left border-2 transition-all focus-ring ${
                  isSelected
                    ? "bg-primary text-black border-border shadow-brutal-sm -translate-x-0.5 -translate-y-0.5 font-bold"
                    : "bg-surface-1 border-border text-text-primary hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-2">
                  <span className="text-base font-mono font-black">{opt.symbol}</span>
                  <span className="text-xs font-black font-display uppercase">
                    {opt.label}
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isSelected ? "text-black/80 font-medium" : "text-text-muted"}`}>
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Account & Profile */}
      <Card level={0} className="p-6 space-y-4">
        <div className="border-b-2 border-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider">
              ACCOUNT & TENANT IDENTITY
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Isolated audit session credentials and profile privileges.
            </p>
          </div>
          <Badge variant="safe" size="sm">ISOLATED</Badge>
        </div>

        {user ? (
          <div className="p-4 rounded-lg bg-surface-1 border-2 border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[2px_2px_0px_var(--border)]">
            <div className="space-y-1 text-xs">
              <div className="font-extrabold text-text-primary text-sm font-display">
                {user.display_name || user.email}
              </div>
              <div className="text-text-muted font-mono font-bold">{user.email}</div>
              <div className="text-[10px] font-mono text-text-muted">SESSION ID: {user.id}</div>
            </div>

            <Button size="sm" variant="destructive" onClick={onLogout}>
              SIGN OUT
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-surface-1 border-2 border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[2px_2px_0px_var(--border)]">
            <div className="text-xs text-text-secondary">
              Currently operating in anonymous guest mode. Sign in to tie scans to your persistent identity.
            </div>
            <Button size="sm" variant="primary" onClick={onOpenAuth}>
              SIGN IN / REGISTER
            </Button>
          </div>
        )}
      </Card>

      {/* Architectural Guarantees */}
      <Card level={0} className="p-6 space-y-4">
        <div className="border-b-2 border-border pb-3">
          <h3 className="text-xs font-mono font-extrabold text-text-primary uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-theme-success stroke-[2.5]" />
            <span>ARCHITECTURAL & PRIVACY INVARIANTS</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-surface-1 border-2 border-border space-y-1 shadow-[2px_2px_0px_var(--border)]">
            <div className="font-extrabold text-text-primary font-display">Zero Dynamic Execution</div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Files uploaded to NeuroCraft are quarantined in memory and inspected strictly with deterministic parsers. Binaries are never executed.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-1 border-2 border-border space-y-1 shadow-[2px_2px_0px_var(--border)]">
            <div className="font-extrabold text-text-primary font-display">Quantum Channel Non-Locality</div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              All quantum trust calculations simulate Bell-state density matrix projections locally without relying on external cloud APIs.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-1 border-2 border-border space-y-1 shadow-[2px_2px_0px_var(--border)]">
            <div className="font-extrabold text-text-primary font-display">Free-First FOSS Stack</div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Zero mandatory paid vendor dependencies. Runs entirely self-contained with Python 3.11+ and standard cryptographic libraries.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-1 border-2 border-border space-y-1 shadow-[2px_2px_0px_var(--border)]">
            <div className="font-extrabold text-text-primary font-display">Evidence Transparency</div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Unsigned binaries are flagged for absence of Authenticode certificates, never blindly marked as malware without supporting evidence.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
