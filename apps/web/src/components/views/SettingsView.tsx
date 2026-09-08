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
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
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
      label: "Light Mode",
      desc: "Warm neutral white surfaces with deep readable text",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark Mode",
      desc: "Deep non-fatiguing charcoal surfaces for focused inspection",
      icon: Moon,
    },
    {
      id: "system",
      label: "System Preference",
      desc: "Automatically synchronize with your operating system settings",
      icon: Laptop,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-primary-subtle text-primary text-[11px] font-mono font-bold mb-2">
          <Settings className="w-3.5 h-3.5" />
          <span>PREFERENCES & CONFIGURATION</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          Application Settings
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Customize your theme, inspect user profile and cryptographic credentials, and review architecture guarantees.
        </p>
      </div>

      {/* Theme Selection */}
      <Card level={1} className="p-6 space-y-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            Appearance & Interface Theme
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Select how NeuroCraft looks on your device. Persisted automatically in local storage.
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
                    ? "bg-primary-subtle border-primary shadow-xs ring-1 ring-primary"
                    : "bg-surface-0 border-border hover:border-border-strong hover:bg-surface-1"
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-2">
                  <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-text-muted"}`} />
                  <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-text-primary"}`}>
                    {opt.label}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Account & Profile */}
      <Card level={1} className="p-6 space-y-4">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Account & Tenant Identity
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Row-level isolated profile for private persistent scan history.
            </p>
          </div>
          <Badge variant="safe" size="sm">
            ISOLATED
          </Badge>
        </div>

        {user ? (
          <div className="p-4 rounded-xl bg-surface-0 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="font-bold text-text-primary text-sm">{user.display_name || user.email}</div>
              <div className="text-text-muted font-mono">{user.email}</div>
              <div className="text-[11px] font-mono text-text-muted">User ID: {user.id}</div>
            </div>

            <Button size="sm" variant="destructive" onClick={onLogout}>
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface-0 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-xs text-text-secondary">
              Currently using guest mode. Sign in to save scans to your personal private workspace.
            </div>
            <Button size="sm" onClick={onOpenAuth}>
              Sign In / Register
            </Button>
          </div>
        )}
      </Card>

      {/* Architectural Guarantees */}
      <Card level={2} className="p-6 space-y-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-theme-success" />
            <span>Architectural & Privacy Guarantees</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <div className="font-bold text-text-primary">Zero Dynamic Execution</div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Files uploaded to NeuroCraft are inspected strictly with safe static parsers. Binaries are never executed.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-text-primary">Simulated Quantum Channels</div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              All quantum trust evaluations simulate physical statevector channel distributions locally using pure mathematical modeling.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-text-primary">Free-First FOSS Stack</div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Zero mandatory paid vendor APIs. Fully operational with zero-configuration local SQLite.
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-text-primary">Evidence Transparency</div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Unsigned does not equal malicious. Scores are accompanied by transparent point-by-point evidence explanations.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
