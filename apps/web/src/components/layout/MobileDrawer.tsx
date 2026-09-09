import React, { useEffect } from "react";
import {
  X,
  LayoutDashboard,
  FileSearch,
  Globe2,
  Atom,
  FileText,
  History,
  Settings,
  HelpCircle,
  LogOut,
  LogIn,
} from "lucide-react";
import { UserProfile } from "../../types";

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenHelp: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  user,
  onOpenAuth,
  onLogout,
  onOpenHelp,
}) => {
  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "scanner", label: "Analyze File", icon: FileSearch },
    { id: "recon", label: "Recon", icon: Globe2 },
    { id: "quantum", label: "Trust", icon: Atom },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "history", label: "History", icon: History },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-72 max-w-[85vw] h-full bg-surface-0 border-r border-border flex flex-col z-10 shadow-2xl p-4 overflow-y-auto">
        {/* Header with Brand and Close */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-surface-1 border border-border flex items-center justify-center p-1.5 shadow-xs">
              <svg viewBox="0 0 64 64" fill="none" className="w-6 h-6">
                <path
                  d="M32 4L54 12V30C54 44.5 44.5 56.5 32 60C19.5 56.5 10 44.5 10 30V12L32 4Z"
                  fill="var(--surface-0)"
                  stroke="var(--primary)"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path
                  d="M23 44V20L41 44V20"
                  stroke="var(--primary)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="32" cy="32" r="3" fill="var(--primary)" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-text-primary">
                NeuroCraft
              </div>
              <div className="text-[11px] text-text-muted font-medium">
                Know what you can trust
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-surface-1 hover:bg-surface-2 text-text-muted hover:text-text-primary transition focus-ring"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4 space-y-1.5">
          <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Features
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary-subtle text-primary font-bold border border-primary-border shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-text-muted"}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Secondary Navigation */}
        <div className="border-t border-border pt-4 space-y-1.5">
          <button
            onClick={() => handleItemClick("settings")}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === "settings"
                ? "bg-primary-subtle text-primary font-bold border border-primary-border"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
            }`}
          >
            <Settings className="w-5 h-5 text-text-muted" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => {
              onOpenHelp();
              onClose();
            }}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-1 transition-all"
          >
            <HelpCircle className="w-5 h-5 text-text-muted" />
            <span>Help & FAQ</span>
          </button>

          {/* User Auth */}
          <div className="pt-2">
            {user ? (
              <div className="flex items-center justify-between rounded-xl bg-surface-1 border border-border p-3">
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {user.display_name?.charAt(0) || user.email.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-text-primary truncate">
                      {user.display_name || user.email}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      Active Account
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="p-1.5 rounded-lg text-text-muted hover:text-danger transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenAuth();
                  onClose();
                }}
                className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-surface-1 border border-border hover:bg-surface-2 text-text-primary text-sm font-semibold transition-colors shadow-xs"
              >
                <LogIn className="w-4 h-4 text-primary" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
