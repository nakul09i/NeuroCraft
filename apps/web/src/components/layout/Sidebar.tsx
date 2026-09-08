import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileSearch,
  Globe2,
  Atom,
  FileText,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Star,
  HelpCircle,
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
  // Persisted collapse state
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
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "scanner", label: "File Analysis", icon: FileSearch },
    { id: "recon", label: "Passive Recon", icon: Globe2 },
    { id: "quantum", label: "Quantum Trust", icon: Atom, badge: "EPR" },
    { id: "reports", label: "Security Reports", icon: FileText },
    { id: "history", label: "Audit History", icon: History },
  ];

  const favoriteItems = navItems.filter((item) => favorites.includes(item.id));

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border/60 neu-base transition-all duration-200 z-30 select-none ${
        collapsed ? "w-[76px]" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-18 border-b border-border/60 flex items-center justify-between px-4 py-4">
        <div
          onClick={() => onSelectTab("dashboard")}
          className="flex items-center space-x-3 cursor-pointer group overflow-hidden"
          title="NeuroCraft Security Console"
        >
          {/* Custom SVG Geometric Shield Icon */}
          <div className="w-10 h-10 rounded-2xl neu-button flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform p-1.5">
            <svg viewBox="0 0 64 64" fill="none" className="w-7 h-7">
              <path
                d="M32 4L54 12V30C54 44.5 44.5 56.5 32 60C19.5 56.5 10 44.5 10 30V12L32 4Z"
                fill="#0C111C"
                stroke="#0284c7"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path
                d="M23 44V20L41 44V20"
                stroke="#38bdf8"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="32" cy="32" r="3" fill="#ffffff" />
            </svg>
          </div>

          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-text-primary">
                NeuroCraft
              </span>
              <span className="text-[11px] text-text-muted font-medium">
                Detect. Verify. Prove.
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-xl neu-button text-text-muted hover:text-text-primary transition focus-ring"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation and Favorites Body */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
        {/* Favorites Section */}
        {favoriteItems.length > 0 && (
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
                <span>Favorites</span>
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              </div>
            )}
            {favoriteItems.map((fav) => {
              const Icon = fav.icon;
              const isActive = activeTab === fav.id;
              return (
                <button
                  key={`fav-${fav.id}`}
                  onClick={() => onSelectTab(fav.id)}
                  title={collapsed ? `Favorite: ${fav.label}` : undefined}
                  className={`w-full flex items-center rounded-xl text-sm transition-all duration-150 relative ${
                    collapsed ? "justify-center p-3" : "px-3 py-2 space-x-2.5"
                  } ${
                    isActive
                      ? "neu-inset text-primary font-semibold"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-0/60 font-medium"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-amber-500"}`} />
                  {!collapsed && <span className="truncate">{fav.label}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Primary Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Console Tools
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isFav = favorites.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl text-[15px] cursor-pointer transition-all duration-150 group relative ${
                  collapsed ? "justify-center p-3" : "px-3.5 py-2.5 space-x-3"
                } ${
                  isActive
                    ? "neu-inset text-primary font-semibold"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-0/60 font-medium"
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? "text-primary stroke-[2.2]" : "text-text-muted stroke-[1.8]"
                  }`}
                />
                {!collapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span>{item.label}</span>
                    <div className="flex items-center space-x-1.5">
                      {item.badge && (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-primary/20 text-primary font-bold"
                              : "neu-raised-sm bg-surface-0 text-text-muted font-medium"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <button
                        onClick={(e) => toggleFavorite(e, item.id)}
                        className={`p-1 rounded-md text-text-muted hover:text-amber-500 transition-opacity ${
                          isFav ? "text-amber-500 opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                        title={isFav ? "Remove favorite" : "Pin as favorite"}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? "fill-amber-500 text-amber-500" : ""}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-border/60" />

      {/* Settings, Help & User Identity Bottom */}
      <div className="p-3 space-y-1.5">
        {/* Settings */}
        <button
          onClick={() => onSelectTab("settings")}
          title={collapsed ? "Settings" : undefined}
          className={`w-full flex items-center rounded-xl text-[15px] transition-all duration-150 ${
            collapsed ? "justify-center p-3" : "px-3.5 py-2.5 space-x-3"
          } ${
            activeTab === "settings"
              ? "neu-inset text-primary font-semibold"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-0/60 font-medium"
          }`}
        >
          <Settings className={`w-5 h-5 shrink-0 ${activeTab === "settings" ? "text-primary" : "text-text-muted"}`} />
          {!collapsed && <span>Settings</span>}
        </button>

        {/* Help */}
        <button
          onClick={onOpenHelp}
          title={collapsed ? "Help & Shortcuts" : undefined}
          className={`w-full flex items-center rounded-xl text-[15px] text-text-secondary hover:text-text-primary hover:bg-surface-0/60 font-medium transition-all duration-150 ${
            collapsed ? "justify-center p-3" : "px-3.5 py-2.5 space-x-3"
          }`}
        >
          <HelpCircle className="w-5 h-5 text-text-muted shrink-0" />
          {!collapsed && <span>Help & Docs</span>}
        </button>

        {/* User Profile */}
        {user ? (
          <div
            className={`flex items-center justify-between rounded-xl neu-raised-sm p-2 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {!collapsed && (
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {user.display_name?.charAt(0) || user.email.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-text-primary truncate">
                    {user.display_name || user.email}
                  </div>
                  <div className="text-[10px] text-text-muted uppercase font-mono">
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
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            title={collapsed ? "Sign In" : undefined}
            className={`w-full flex items-center rounded-xl neu-button text-text-primary text-[14px] font-medium transition-colors ${
              collapsed ? "justify-center p-3" : "px-3.5 py-2.5 space-x-2.5"
            }`}
          >
            <LogIn className="w-4 h-4 text-text-muted" />
            {!collapsed && <span>Sign In</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
