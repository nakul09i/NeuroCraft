import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, Trash2, ExternalLink, ShieldCheck, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { useNotifications, SecurityNotification } from "../../context/NotificationContext";

interface NotificationCenterProps {
  onNavigate: (tabId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notif: SecurityNotification) => {
    markAsRead(notif.id);
    if (notif.tabTarget) {
      onNavigate(notif.tabTarget);
      setIsOpen(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.round(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.round(hrs / 24)}d ago`;
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl neu-button text-text-secondary hover:text-text-primary transition-all focus-ring"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="w-4 h-4 stroke-[2]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-cyan-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-0 border border-border/80 rounded-2xl neu-raised-lg p-5 z-50 shadow-2xl animate-scaleIn">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-text-primary">
                Security Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg neu-button text-text-muted hover:text-text-primary text-[11px] transition-colors"
                  title="Mark all as read"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1.5 rounded-lg neu-button text-text-muted hover:text-danger text-[11px] transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">
              All caught up! No active security notifications.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {notifications.map((notif) => {
                let Icon = Info;
                let iconColor = "text-primary";
                if (notif.type === "success") {
                  Icon = ShieldCheck;
                  iconColor = "text-emerald-500";
                } else if (notif.type === "warning") {
                  Icon = AlertTriangle;
                  iconColor = "text-amber-500";
                } else if (notif.type === "error") {
                  Icon = AlertCircle;
                  iconColor = "text-rose-500";
                }

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      notif.read
                        ? "bg-surface-0/40 border-border/40 text-text-muted hover:bg-surface-1/50"
                        : "neu-inset-sm bg-surface-0/70 border-primary/30 text-text-primary shadow-xs"
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold truncate text-text-primary">
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-text-muted shrink-0 ml-2 font-mono">
                            {formatTime(notif.time)}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5 leading-snug line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
