import React from "react";
import {
  Shield,
  Activity,
  FileSearch,
  Globe,
  Atom,
  FileText,
  User,
  LogOut,
  LogIn,
} from "lucide-react";
import { UserProfile } from "../types";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
  onLogout,
}) => {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "scanner", label: "File Analysis", icon: FileSearch },
    { id: "recon", label: "Passive Recon", icon: Globe },
    { id: "quantum", label: "Quantum Trust", icon: Atom },
    { id: "reports", label: "Security Reports", icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setActiveTab("dashboard")}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center group-hover:border-cyan-400 transition shadow-cyan-glow">
            <Shield className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-lg tracking-wider text-white">NEUROCRAFT</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                MVP
              </span>
            </div>
            <p className="text-[10px] tracking-wide text-slate-400 font-mono">
              Detect. Verify. Prove.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Auth Section */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>ENGINES READY</span>
          </div>

          {user ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-xs bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-200 font-medium">{user.display_name || user.email}</span>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-1 rounded">
                  {user.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Logout"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold tracking-wide transition shadow-sm"
            >
              <LogIn className="w-4 h-4 text-cyan-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
