import React from "react";
import { LayoutDashboard, FileSearch, Globe2, Atom, FileText, Settings } from "lucide-react";

export interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const items = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "scanner", label: "Files", icon: FileSearch },
    { id: "recon", label: "Websites", icon: Globe2 },
    { id: "quantum", label: "Trust Test", icon: Atom },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-surface-0/90 backdrop-blur-md flex items-center justify-around px-2 z-40 shadow-lg"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-xs font-medium transition-all focus-ring ${
              isActive
                ? "text-primary font-bold"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${isActive ? "bg-primary-subtle" : ""}`}>
              <Icon className={`w-5 h-5 ${isActive ? "text-primary stroke-[2.2]" : "text-text-muted stroke-[1.8]"}`} />
            </div>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
