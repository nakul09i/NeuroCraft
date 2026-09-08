import React from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  className = "",
  size = "md",
}) => {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1 rounded-xl bg-surface-2 border border-border/80 ${className}`}
    >
      {items.map((tab) => {
        const isActive = activeId === tab.id;
        let padding = "px-3.5 py-1.5 text-xs";
        if (size === "sm") padding = "px-2.5 py-1 text-[11px]";

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 rounded-lg font-semibold transition-all focus-ring ${padding} ${
              isActive
                ? "bg-surface-elevated text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary hover:bg-surface-0/50"
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive
                    ? "bg-primary text-text-inverse"
                    : "bg-surface-3 text-text-secondary"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
