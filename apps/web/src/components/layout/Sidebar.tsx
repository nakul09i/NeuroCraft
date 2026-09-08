import React, { useState } from "react";
import {
  LayoutDashboard,
  FileSearch,
  Globe,
  Atom,
  FileText,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  LogOut,
  LogIn,
} from "lucide-react";
import { UserProfile } from "../../types";

export interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onOpenAuth,
  onLogout,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      title: "OVERVIEW",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "ANALYSIS",
      items: [
        { id: "scanner", label: "File Analysis", icon: FileSearch },
        { id: "recon", label: "Passive Recon", icon: Globe },
      ],
    },
    {
      title: "VERIFICATION",
      items: [
        { id: "quantum", label: "Quantum Trust", icon: Atom, badge: "SIH" },
      ],
    },
    {
      title: "REPORTING",
      items: [
        { id: "reports", label: "Reports", icon: FileText },
        { id: "history", label: "History", icon: History },
      ],
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border bg-surface-0 transition-all duration-300 z-30 select-none ${
        collapsed ? "w-18" : "w-60"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 border-b border-border/80 flex items-center justify-between px-4">
        <div
          onClick={() => onSelectTab("dashboard")}
          className="flex items-center space-x-3 cursor-pointer group overflow-hidden"
        >
          {/* NeuroCraft Connected Trust-Node Motif */}
          <div className="w-9 h-9 rounded-xl bg-primary-subtle border border-primary-border flex items-center justify-center shrink-0 group-hover:border-primary transition shadow-xs">
            <Shield className="w-4.5 h-4.5 text-primary group-hover:scale-105 transition-transform" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-text-primary">
                NEUROCRAFT
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                Detect · Verify · Prove
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition focus-ring"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Categorized Navigation Sections */}
      <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-3 text-[10px] font-mono font-bold tracking-widest text-text-muted uppercase mb-1">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded-lg transition-all font-medium text-xs focus-ring relative group ${
                    collapsed ? "justify-center p-2.5" : "px-3 py-2 space-x-3"
                  } ${
                    isActive
                      ? "bg-primary-subtle text-primary font-bold shadow-xs"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
                  }`}
                >
                  {/* Active Route Indicator Pill */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-glow" />
                  )}
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? "text-primary" : "text-text-muted group-hover:text-text-primary"
                    }`}
                  />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-400/20 font-bold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* SYSTEM Section / Bottom Actions */}
      <div className="p-2 border-t border-border/80 space-y-2 bg-surface-0/50">
        {!collapsed && (
          <div className="px-3 text-[10px] font-mono font-bold tracking-widest text-text-muted uppercase">
            SYSTEM
          </div>
        )}
        <button
          onClick={() => onSelectTab("settings")}
          title={collapsed ? "Settings" : undefined}
          className={`w-full flex items-center rounded-lg transition-all font-medium text-xs focus-ring ${
            collapsed ? "justify-center p-2.5" : "px-3 py-2 space-x-3"
          } ${
            activeTab === "settings"
              ? "bg-primary-subtle text-primary font-bold"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
          }`}
        >
          <Settings className="w-4 h-4 shrink-0 text-text-muted" />
          {!collapsed && <span>Settings</span>}
        </button>

        {user ? (
          <div
            className={`flex items-center justify-between rounded-lg bg-surface-1 p-2 border border-border/60 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {!collapsed && (
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center text-text-primary font-bold text-xs shrink-0">
                  {user.display_name?.charAt(0) || user.email.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-text-primary truncate">
                    {user.display_name || user.email}
                  </div>
                  <div className="text-[10px] text-text-muted uppercase font-mono truncate">
                    {user.role}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-surface-2 transition shrink-0"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            title={collapsed ? "Sign In" : undefined}
            className={`w-full flex items-center rounded-lg bg-primary-subtle border border-primary-border text-primary font-bold text-xs transition-all focus-ring ${
              collapsed ? "justify-center p-2.5" : "px-3 py-2 space-x-2.5"
            }`}
          >
            <LogIn className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign In</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
