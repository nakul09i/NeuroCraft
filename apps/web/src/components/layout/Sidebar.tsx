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

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "scanner", label: "File Analysis", icon: FileSearch },
    { id: "recon", label: "Passive Recon", icon: Globe },
    { id: "quantum", label: "Quantum Trust", icon: Atom, badge: "EPR" },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border bg-surface-0/80 backdrop-blur-md transition-all duration-200 z-30 select-none ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 border-b border-border/60 flex items-center justify-between px-4">
        <div
          onClick={() => onSelectTab("dashboard")}
          className="flex items-center space-x-3 cursor-pointer group overflow-hidden"
        >
          <div className="w-8 h-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center shrink-0 border border-primary-border/60 group-hover:bg-primary group-hover:text-white transition-colors duration-200">
            <Shield className="w-4 h-4 stroke-[2]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-text-primary">
                NeuroCraft
              </span>
              <span className="text-[10px] text-text-muted">
                Detect. Verify. Prove.
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition focus-ring"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl text-xs transition-all duration-150 relative group ${
                collapsed ? "justify-center p-2.5" : "px-3 py-2 space-x-3"
              } ${
                isActive
                  ? "bg-primary-subtle text-primary font-semibold"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-1 font-medium"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? "text-primary" : "text-text-muted group-hover:text-text-primary"
                }`}
              />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-primary/20 text-primary font-semibold"
                          : "bg-surface-2 text-text-muted"
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
      </nav>

      {/* Settings & User Identity / Bottom */}
      <div className="p-2 border-t border-border/60 space-y-1">
        <button
          onClick={() => onSelectTab("settings")}
          title={collapsed ? "Settings" : undefined}
          className={`w-full flex items-center rounded-xl text-xs transition-all duration-150 ${
            collapsed ? "justify-center p-2.5" : "px-3 py-2 space-x-3"
          } ${
            activeTab === "settings"
              ? "bg-primary-subtle text-primary font-semibold"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-1 font-medium"
          }`}
        >
          <Settings className={`w-4 h-4 shrink-0 ${activeTab === "settings" ? "text-primary" : "text-text-muted"}`} />
          {!collapsed && <span>Settings</span>}
        </button>

        {user ? (
          <div
            className={`flex items-center justify-between rounded-xl bg-surface-1/60 p-2 border border-border/40 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {!collapsed && (
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="w-6 h-6 rounded-lg bg-surface-2 text-text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                  {user.display_name?.charAt(0) || user.email.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-text-primary truncate">
                    {user.display_name || user.email}
                  </div>
                  <div className="text-[10px] text-text-muted truncate">
                    {user.role}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1 rounded-lg text-text-muted hover:text-danger hover:bg-surface-2 transition shrink-0"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            title={collapsed ? "Sign In" : undefined}
            className={`w-full flex items-center rounded-xl bg-surface-1 hover:bg-surface-2 text-text-primary text-xs font-medium border border-border transition-colors ${
              collapsed ? "justify-center p-2.5" : "px-3 py-2 space-x-2"
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-text-muted" />
            {!collapsed && <span>Sign In</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
