import React from "react";
import { LayoutDashboard, FileSearch, Atom, FileText, Settings } from "lucide-react";

export interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const items = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "scanner", label: "Scan", icon: FileSearch },
    { id: "quantum", label: "Quantum", icon: Atom },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-surface-0/95 backdrop-blur-md flex items-center justify-around px-3 z-40 neu-raised-md"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl text-xs font-semibold transition-all ${
              isActive
                ? "neu-inset-sm bg-primary/10 text-primary"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-primary stroke-[2.2]" : "text-text-muted stroke-[1.8]"}`} />
            <span className="text-[11px]">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
