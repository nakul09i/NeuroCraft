import React, { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
  Cpu,
  Lock,
  Eye,
  LogOut,
  UserCheck,
  Sidebar as SidebarIcon,
  Bell,
  EyeOff,
  Sliders,
  Check,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useTheme, ThemeMode } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
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
  const { toast } = useToast();

  // Navigation preference state
  const [navMode, setNavMode] = useState<"expanded" | "collapsed">(() => {
    return localStorage.getItem("neurocraft_sidebar_collapsed") === "true"
      ? "collapsed"
      : "expanded";
  });

  // Notification preference state
  const [notifsEnabled, setNotifsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("neurocraft_notifications_enabled") !== "false";
  });

  // Reduced motion preference state
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return localStorage.getItem("neurocraft_reduced_motion") === "true";
  });

  const handleNavModeChange = (mode: "expanded" | "collapsed") => {
    setNavMode(mode);
    localStorage.setItem("neurocraft_sidebar_collapsed", String(mode === "collapsed"));
    toast.success(`Navigation set to ${mode} mode.`);
  };

  const handleNotifToggle = () => {
    const next = !notifsEnabled;
    setNotifsEnabled(next);
    localStorage.setItem("neurocraft_notifications_enabled", String(next));
    toast.info(`System alerts ${next ? "enabled" : "muted"}.`);
  };

  const handleMotionToggle = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    localStorage.setItem("neurocraft_reduced_motion", String(next));
    if (next) {
      document.documentElement.classList.add("reduced-motion");
    } else {
      document.documentElement.classList.remove("reduced-motion");
    }
    toast.info(`Reduced motion ${next ? "activated" : "deactivated"}.`);
  };

  const themeOptions: Array<{ id: ThemeMode; label: string; desc: string; icon: any }> = [
    {
      id: "light",
      label: "Light Mode",
      desc: "Cool slate and soft blue-gray surfaces (#EEF3F7) with tactile raised and inset shadows",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark Mode",
      desc: "Deep navy near-black surfaces (#0C111C) with subtle dual-directional shadows and cyan accents",
      icon: Moon,
    },
    {
      id: "system",
      label: "System Preference",
      desc: "Automatically harmonize interface elevation and tones with your OS window manager",
      icon: Laptop,
    },
  ];

  const invariants = [
    {
      title: "Zero Dynamic Execution",
      desc: "Uploaded files are quarantined in-memory and inspected strictly with deterministic PE/ELF/Mach-O static parsers. Binaries are never executed or spawned as processes.",
      icon: Lock,
    },
    {
      title: "Quantum Non-Locality Simulation",
      desc: "All quantum trust calculations simulate Bell-state density matrix projections locally via classical statevector mathematics without relying on paid external cloud APIs.",
      icon: Cpu,
    },
    {
      title: "Free-First Open Source Stack",
      desc: "Zero mandatory proprietary vendor dependencies. The entire system runs self-contained on Python 3.11+ and standard cryptographic and linear algebra libraries.",
      icon: ShieldCheck,
    },
    {
      title: "Evidence-Based Transparency",
      desc: "Unsigned binaries are flagged for absence of Authenticode certificates, never blindly marked as malware without inspectable cryptographic proof.",
      icon: Eye,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-14">
      {/* Header Banner */}
      <Card surface="raised" className="p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex items-center space-x-2.5 mb-3">
          <Badge variant="neutral" size="sm">System Configuration</Badge>
          <span className="text-xs font-mono text-text-muted">
            Environment & Security Invariants
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
          Application Settings
        </h1>
        <p className="text-base text-text-secondary mt-2 max-w-2xl leading-relaxed">
          Customize your soft neumorphic interface appearance, configure navigation defaults, manage session credentials, and verify cryptographic security invariants.
        </p>
      </Card>

      {/* Theme Selection */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-5">
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
            Interface Theme
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Persisted across local browser sessions with instant live switching.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`p-5 rounded-2xl text-left border transition-all duration-200 ${
                  isSelected
                    ? "neu-inset border-primary/50 bg-primary/10 text-text-primary shadow-inner"
                    : "neu-button bg-surface-0 border-border/60 text-text-secondary hover:text-text-primary"
                }`}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2.5 rounded-xl ${isSelected ? "neu-inset-sm text-primary" : "neu-button text-text-muted"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-base font-bold text-text-primary">
                    {opt.label}
                  </span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-text-muted">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Navigation & Accessibility Preferences */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-6">
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
            Navigation & Accessibility
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Configure default sidebar behavior and motion ergonomics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Default Sidebar Mode */}
          <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60 space-y-3">
            <div className="flex items-center space-x-2">
              <SidebarIcon className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-text-primary">Default Sidebar</span>
            </div>
            <p className="text-text-secondary">Choose default layout on screen load.</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleNavModeChange("expanded")}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold ${
                  navMode === "expanded" ? "neu-inset bg-primary/15 text-primary" : "neu-button text-text-muted"
                }`}
              >
                Expanded
              </button>
              <button
                onClick={() => handleNavModeChange("collapsed")}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold ${
                  navMode === "collapsed" ? "neu-inset bg-primary/15 text-primary" : "neu-button text-text-muted"
                }`}
              >
                Collapsed
              </button>
            </div>
          </div>

          {/* System Notifications */}
          <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60 space-y-3">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-text-primary">Security Alerts</span>
            </div>
            <p className="text-text-secondary">Show banner toasts when scans finish.</p>
            <div className="pt-1">
              <button
                onClick={handleNotifToggle}
                className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  notifsEnabled
                    ? "neu-inset bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "neu-button text-text-muted"
                }`}
              >
                {notifsEnabled ? "✓ Alerts Active" : "○ Alerts Muted"}
              </button>
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="p-4 rounded-2xl neu-inset-sm bg-surface-0/60 space-y-3">
            <div className="flex items-center space-x-2">
              <EyeOff className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-text-primary">Reduced Motion</span>
            </div>
            <p className="text-text-secondary">Minimize interface animations & transitions.</p>
            <div className="pt-1">
              <button
                onClick={handleMotionToggle}
                className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  reducedMotion
                    ? "neu-inset bg-primary/15 text-primary"
                    : "neu-button text-text-muted"
                }`}
              >
                {reducedMotion ? "✓ Reduced Motion On" : "Standard Animations"}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Account & Session Credentials */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-6">
        <div className="border-b border-border/60 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
              Account & Session Information
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Private isolated tenant credentials and session tokens.
            </p>
          </div>
          <Badge variant="safe" size="md">
            Isolated Tenant
          </Badge>
        </div>

        {user ? (
          <div className="p-5 rounded-2xl neu-inset bg-surface-0/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-text-primary text-base">
                  {user.display_name || user.email}
                </span>
              </div>
              <div className="text-sm text-text-secondary font-mono">{user.email}</div>
              <div className="text-xs font-mono text-text-muted">
                Session ID: {user.id} · Role: {user.role}
              </div>
            </div>

            <Button
              size="md"
              variant="destructive"
              onClick={onLogout}
              icon={<LogOut className="w-4 h-4" />}
              className="neu-button"
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="p-5 rounded-2xl neu-inset bg-surface-0/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="text-sm text-text-secondary max-w-lg leading-relaxed">
              Operating in anonymous quarantine mode. Sign in or register to tie file provenance audits and report summaries to your organization.
            </div>
            <Button
              size="md"
              variant="primary"
              onClick={onOpenAuth}
              className="shadow-md font-semibold text-sm whitespace-nowrap"
            >
              Sign In / Register
            </Button>
          </div>
        )}
      </Card>

      {/* Architectural Guarantees & Invariants */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-5">
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center space-x-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <span>Architectural & Privacy Invariants</span>
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Core guarantees enforced across the static analysis engine and simulation sandbox.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {invariants.map((inv, idx) => {
            const Icon = inv.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl neu-inset-sm bg-surface-0/40 border border-border/50 space-y-2"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl neu-inset-sm text-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-base text-text-primary">
                    {inv.title}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed pl-9">
                  {inv.desc}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
