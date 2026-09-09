import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileSearch,
  Globe2,
  Atom,
  FileText,
  History,
  Settings,
  Star,
  HelpCircle,
  LogOut,
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { UserProfile } from "../../types";

export interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenHelp: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onOpenAuth,
  onLogout,
  onOpenHelp,
}) => {
  // Persisted collapse state (manual toggle only)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("neurocraft_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Persisted favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("neurocraft_favorites_v1");
      if (stored) return JSON.parse(stored);
    } catch {}
    return ["scanner", "recon"];
  });

  useEffect(() => {
    try {
      localStorage.setItem("neurocraft_sidebar_collapsed", String(collapsed));
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem("neurocraft_favorites_v1", JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const navItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "scanner", label: "Analyze File", icon: FileSearch },
    { id: "recon", label: "Recon", icon: Globe2 },
    { id: "quantum", label: "Trust", icon: Atom },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border bg-surface-0 transition-all duration-200 ease-in-out z-30 select-none shrink-0 ${
        collapsed ? "w-[72px] min-w-[72px]" : "w-64 min-w-[256px]"
      }`}
      aria-label="Primary Navigation Sidebar"
    >
      {/* Brand Header & Toggle */}
      {collapsed ? (
        <div className="h-16 border-b border-border flex items-center justify-between px-3">
          <button
            onClick={() => onSelectTab("dashboard")}
            className="w-8 h-8 rounded-lg bg-surface-1 border border-border flex items-center justify-center p-1 hover:border-primary/50 transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Overview"
            aria-label="Overview"
          >
            <svg viewBox="0 0 64 64" fill="none" className="w-5 h-5">
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
          </button>
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-lg hover:bg-surface-1 text-text-muted hover:text-text-primary transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="h-16 border-b border-border flex items-center justify-between px-4">
          <div
            onClick={() => onSelectTab("dashboard")}
            className="flex items-center space-x-3 cursor-pointer group overflow-hidden"
            title="NeuroCraft"
          >
            <div className="w-8 h-8 rounded-lg bg-surface-1 border border-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform p-1 shadow-xs">
              <svg viewBox="0 0 64 64" fill="none" className="w-5 h-5">
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
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-text-primary">
                NeuroCraft
              </span>
              <span className="text-[11px] text-text-muted font-medium">
                Detect. Verify. Prove.
              </span>
            </div>
          </div>

          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-surface-1 text-text-muted hover:text-text-primary transition focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Navigation Body */}
      <div className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center rounded-xl text-[14px] cursor-pointer transition-all duration-150 text-left ${
                  collapsed ? "justify-center p-2.5" : "px-3 py-2.5 space-x-3"
                } ${
                  isActive
                    ? "bg-primary-subtle text-primary font-semibold border border-primary-border shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-1 font-medium"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-primary stroke-[2.2]" : "text-text-muted stroke-[1.8] group-hover:text-text-primary"
                  }`}
                />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>

              {/* Floating tooltip when collapsed */}
              {collapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 whitespace-nowrap rounded-lg bg-surface-elevated px-2.5 py-1.5 text-xs font-semibold text-text-primary shadow-lg border border-border opacity-0 -translate-x-1 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-2.5 border-t border-border" />

      {/* Settings, Help & User Identity Bottom */}
      <div className="p-2.5 space-y-1.5">
        {/* Settings */}
        <div className="relative group">
          <button
            onClick={() => onSelectTab("settings")}
            className={`w-full flex items-center rounded-xl text-[14px] transition-all duration-150 ${
              collapsed ? "justify-center p-2.5" : "px-3 py-2 space-x-3"
            } ${
              activeTab === "settings"
                ? "bg-primary-subtle text-primary font-bold border border-primary-border"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-1 font-medium"
            }`}
          >
            <Settings className={`w-4 h-4 shrink-0 ${activeTab === "settings" ? "text-primary" : "text-text-muted"}`} />
            {!collapsed && <span>Settings</span>}
          </button>
          {collapsed && (
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-text-primary shadow-xl border border-border opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              Settings
            </div>
          )}
        </div>

        {/* Help & FAQs */}
        <div className="relative group">
          <button
            onClick={onOpenHelp}
            className={`w-full flex items-center rounded-xl text-[14px] text-text-secondary hover:text-text-primary hover:bg-surface-1 font-medium transition-all duration-150 ${
              collapsed ? "justify-center p-2.5" : "px-3 py-2 space-x-3"
            }`}
          >
            <HelpCircle className="w-4 h-4 text-text-muted shrink-0 group-hover:text-text-primary" />
            {!collapsed && <span>Help & FAQ</span>}
          </button>
          {collapsed && (
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-text-primary shadow-xl border border-border opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              Help & FAQ
            </div>
          )}
        </div>

        {/* User Profile / Auth State */}
        {user ? (
          <div
            className={`flex items-center justify-between rounded-xl bg-surface-1 border border-border p-2 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {!collapsed ? (
              <>
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/30">
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
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-surface-2 transition shrink-0"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="relative group">
                <button
                  onClick={onLogout}
                  className="w-8 h-8 rounded-lg bg-surface-0 border border-border flex items-center justify-center text-text-muted hover:text-danger transition focus-ring shadow-xs"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-text-primary shadow-xl border border-border opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  {user.display_name || user.email} (Sign out)
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative group">
            <button
              onClick={onOpenAuth}
              className={`w-full flex items-center rounded-xl bg-surface-0 border border-border hover:bg-surface-1 text-text-primary text-[13px] font-semibold transition-colors shadow-xs ${
                collapsed ? "justify-center p-2.5" : "px-3 py-2 space-x-2.5"
              }`}
            >
              <LogIn className="w-4 h-4 text-primary" />
              {!collapsed && <span>Sign In</span>}
            </button>
            {collapsed && (
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-text-primary shadow-xl border border-border opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Sign In
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
