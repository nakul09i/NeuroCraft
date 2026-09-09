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
  Sparkles,
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

  const themeOptions: Array<{ id: ThemeMode; label: string; desc: string; icon: any; previewBg: string }> = [
    {
      id: "light",
      label: "Light Mode",
      desc: "Clean porcelain canvas with layered white cards, crisp borders, and soft shadows",
      icon: Sun,
      previewBg: "bg-slate-100 border-slate-300 text-slate-900",
    },
    {
      id: "dark",
      label: "Dark Mode",
      desc: "Deep obsidian canvas with layered dark surfaces, soft borders, and cyan rim highlights",
      icon: Moon,
      previewBg: "bg-slate-900 border-slate-700 text-slate-100",
    },
    {
      id: "system",
      label: "System Match",
      desc: "Automatically synchronize colors and contrast with your operating system appearance",
      icon: Laptop,
      previewBg: "bg-gradient-to-r from-slate-100 to-slate-900 border-slate-500 text-cyan-400",
    },
  ];

  const invariants = [
    {
      title: "Files Are Never Run",
      desc: "Uploaded files are inspected in a safe memory sandbox. We never execute or launch any files on your computer or servers.",
      icon: Lock,
    },
    {
      title: "Local Trust Simulation",
      desc: "All trust tests run locally using secure mathematical models without sending your data to third-party AI or cloud trackers.",
      icon: Cpu,
    },
    {
      title: "Open & Transparent",
      desc: "Built on open, transparent security standards with zero hidden tracking, telemetry, or proprietary vendor lock-in.",
      icon: ShieldCheck,
    },
    {
      title: "Clear, Honest Explanations",
      desc: "We explain what was found in plain English with clear answers, so you always know what to do next without guesswork.",
      icon: Eye,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <Card surface="raised" className="p-8 sm:p-10 relative overflow-hidden border border-border/80">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24" />

        <div className="flex items-center space-x-2.5 mb-3">
          <Badge variant="neutral" size="sm">Preferences</Badge>
          <span className="text-xs font-mono text-text-muted">
            Appearance & Privacy
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
          Settings
        </h1>
        <p className="text-base text-text-secondary mt-2 max-w-2xl leading-relaxed">
          Customize your theme, notification preferences, account details, and review privacy guarantees.
        </p>
      </Card>

      {/* Theme Selection */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-5 border border-border/80">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
              Interface Theme
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Instant theme switching with View Transition API and zero-flash persistence.
            </p>
          </div>
          <Badge variant="info" size="sm">
            Live Preview
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`p-5 rounded-xl text-left border transition-all duration-200 relative group ${
                  isSelected
                    ? "border-primary bg-primary/5 text-text-primary ring-1 ring-primary/40 shadow-sm"
                    : "bg-surface-1 border-border hover:border-border-strong text-text-secondary hover:text-text-primary"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2.5 rounded-lg ${isSelected ? "bg-primary/10 text-primary" : "bg-surface-2 text-text-muted group-hover:text-text-primary"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-base font-bold text-text-primary">
                    {opt.label}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-text-muted">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Navigation & Accessibility Preferences */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-6 border border-border/80">
        <div className="border-b border-border pb-3">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
            Navigation & Accessibility
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Configure default sidebar behavior and motion ergonomics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Default Sidebar Mode */}
          <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-3">
            <div className="flex items-center space-x-2">
              <SidebarIcon className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-text-primary">Default Sidebar</span>
            </div>
            <p className="text-text-secondary leading-relaxed">Choose default layout on screen load.</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleNavModeChange("expanded")}
                className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  navMode === "expanded"
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-surface-0 border-border text-text-muted hover:text-text-primary"
                }`}
              >
                Expanded
              </button>
              <button
                onClick={() => handleNavModeChange("collapsed")}
                className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  navMode === "collapsed"
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-surface-0 border-border text-text-muted hover:text-text-primary"
                }`}
              >
                Collapsed
              </button>
            </div>
          </div>

          {/* System Notifications */}
          <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-3">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-text-primary">Security Alerts</span>
            </div>
            <p className="text-text-secondary leading-relaxed">Show banner toasts when scans finish.</p>
            <div className="pt-1">
              <button
                onClick={handleNotifToggle}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  notifsEnabled
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-surface-0 border-border text-text-muted hover:text-text-primary"
                }`}
              >
                {notifsEnabled ? "✓ Alerts Active" : "○ Alerts Muted"}
              </button>
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-3">
            <div className="flex items-center space-x-2">
              <EyeOff className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm text-text-primary">Reduced Motion</span>
            </div>
            <p className="text-text-secondary leading-relaxed">Minimize interface animations & transitions.</p>
            <div className="pt-1">
              <button
                onClick={handleMotionToggle}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  reducedMotion
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-surface-0 border-border text-text-muted hover:text-text-primary"
                }`}
              >
                {reducedMotion ? "✓ Reduced Motion On" : "Standard Animations"}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Account & Session Credentials */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-6 border border-border/80">
        <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
              Account & Profile
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Manage your signed-in profile and workspace access.
            </p>
          </div>
          <Badge variant="safe" size="md">
            Secure Session
          </Badge>
        </div>

        {user ? (
          <div className="p-5 rounded-xl bg-surface-1 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-text-primary text-base">
                  {user.display_name || user.email}
                </span>
              </div>
              <div className="text-sm text-text-secondary font-mono">{user.email}</div>
              <div className="text-xs font-mono text-text-muted">
                User ID: {user.id} · Role: {user.role}
              </div>
            </div>

            <Button
              size="md"
              variant="destructive"
              onClick={onLogout}
              icon={<LogOut className="w-4 h-4" />}
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-surface-1 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="text-sm text-text-secondary max-w-lg leading-relaxed">
              Operating in guest mode. Sign in to save your reports, sync checks across devices, and organize team findings.
            </div>
            <Button
              size="md"
              variant="primary"
              onClick={onOpenAuth}
              className="text-sm font-semibold whitespace-nowrap"
            >
              Sign In / Register
            </Button>
          </div>
        )}
      </Card>

      {/* Privacy & Safety Guarantees */}
      <Card surface="raised" className="p-7 sm:p-8 space-y-5 border border-border/80">
        <div className="border-b border-border pb-3">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Privacy & Safety Guarantees</span>
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            How NeuroCraft protects your files, data, and privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {invariants.map((inv, idx) => {
            const Icon = inv.icon;
            return (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-xl bg-surface-1 border border-border space-y-2"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-base text-text-primary">
                    {inv.title}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed pl-8">
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
