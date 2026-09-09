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
      className={`inline-flex items-center p-1 rounded-xl bg-surface-1 border border-border ${className}`}
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
                ? "bg-surface-0 text-primary shadow-xs"
                : "text-text-muted hover:text-text-primary hover:bg-surface-0/50"
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive
                    ? "bg-primary-subtle text-primary border border-primary-border"
                    : "bg-surface-2 text-text-secondary"
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
