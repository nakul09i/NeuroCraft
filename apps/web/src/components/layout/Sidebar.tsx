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
        { id: "quantum", label: "Quantum Trust", icon: Atom, badge: "EPR" },
      ],
    },
    {
      title: "REPORTING",
      items: [
        { id: "reports", label: "Security Reports", icon: FileText },
        { id: "history", label: "History", icon: History },
      ],
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r-2 border-border bg-surface-0 transition-all duration-200 z-30 select-none ${
        collapsed ? "w-18" : "w-60"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 border-b-2 border-border flex items-center justify-between px-3.5 bg-surface-0">
        <div
          onClick={() => onSelectTab("dashboard")}
          className="flex items-center space-x-2.5 cursor-pointer group overflow-hidden"
        >
          {/* NeuroCraft Connected Trust-Node Motif */}
          <div className="w-8 h-8 rounded-md bg-primary border-2 border-border text-black flex items-center justify-center shrink-0 shadow-brutal-sm group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
            <Shield className="w-4 h-4 stroke-[2.5]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight font-display text-text-primary">
                NEUROCRAFT
              </span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-text-muted">
                Detect · Verify · Prove
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md border-2 border-border bg-surface-1 text-text-primary hover:bg-surface-2 hover:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 transition focus-ring"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Categorized Navigation Sections */}
      <nav className="flex-1 py-3 px-2 space-y-3.5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 text-[9px] font-mono font-extrabold tracking-widest text-text-muted uppercase mb-1">
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
                  className={`w-full flex items-center rounded-lg font-bold text-xs transition-all duration-150 focus-ring relative group ${
                    collapsed ? "justify-center p-2.5" : "px-3 py-2 space-x-2.5"
                  } ${
                    isActive
                      ? "bg-primary text-black border-2 border-border shadow-brutal-sm -translate-x-0.5 -translate-y-0.5 font-extrabold"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2 border-2 border-transparent"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 stroke-[2.2] ${
                      isActive ? "text-black" : "text-text-muted group-hover:text-text-primary"
                    }`}
                  />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span className="font-display tracking-tight">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded border ${
                            isActive
                              ? "bg-black text-white border-black"
                              : "bg-accent-purple/20 text-accent-purple border-accent-purple"
                          }`}
                        >
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
      <div className="p-2 border-t-2 border-border space-y-2 bg-surface-0">
        {!collapsed && (
          <div className="px-2.5 text-[9px] font-mono font-extrabold tracking-widest text-text-muted uppercase">
            SYSTEM
          </div>
        )}
        <button
          onClick={() => onSelectTab("settings")}
          title={collapsed ? "Settings" : undefined}
          className={`w-full flex items-center rounded-lg font-bold text-xs transition-all duration-150 focus-ring ${
            collapsed ? "justify-center p-2.5" : "px-3 py-2 space-x-2.5"
          } ${
            activeTab === "settings"
              ? "bg-primary text-black border-2 border-border shadow-brutal-sm font-extrabold"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-2 border-2 border-transparent"
          }`}
        >
          <Settings className={`w-4 h-4 shrink-0 stroke-[2.2] ${activeTab === "settings" ? "text-black" : "text-text-muted"}`} />
          {!collapsed && <span className="font-display tracking-tight">Settings</span>}
        </button>

        {user ? (
          <div
            className={`flex items-center justify-between rounded-lg bg-surface-1 p-2 border-2 border-border shadow-brutal-sm ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {!collapsed && (
              <div className="flex items-center space-x-2 overflow-hidden">
                <div className="w-6 h-6 rounded bg-primary text-black border border-border flex items-center justify-center font-extrabold text-xs shrink-0">
                  {user.display_name?.charAt(0) || user.email.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-text-primary truncate font-display">
                    {user.display_name || user.email}
                  </div>
                  <div className="text-[9px] text-text-muted uppercase font-mono font-bold truncate">
                    {user.role}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1 rounded text-text-muted hover:text-danger hover:bg-surface-2 transition shrink-0"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            title={collapsed ? "Sign In" : undefined}
            className={`w-full flex items-center rounded-lg bg-primary text-black border-2 border-border font-extrabold text-xs shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0.5 active:translate-y-0.5 transition-all duration-150 focus-ring ${
              collapsed ? "justify-center p-2.5" : "px-3 py-2 space-x-2"
            }`}
          >
            <LogIn className="w-4 h-4 shrink-0 stroke-[2.5]" />
            {!collapsed && <span>Sign In</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
