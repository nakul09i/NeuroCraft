import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "warning" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration: number = 4500) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Render Stack */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => {
          let icon = <Info className="w-4 h-4 text-theme-info shrink-0" />;
          let borderClass = "border-theme-info-border bg-surface-elevated";

          if (t.type === "success") {
            icon = <CheckCircle2 className="w-4 h-4 text-theme-success shrink-0" />;
            borderClass = "border-theme-success-border bg-surface-elevated";
          } else if (t.type === "warning") {
            icon = <AlertTriangle className="w-4 h-4 text-theme-warning shrink-0" />;
            borderClass = "border-theme-warning-border bg-surface-elevated";
          } else if (t.type === "error") {
            icon = <AlertCircle className="w-4 h-4 text-theme-danger shrink-0" />;
            borderClass = "border-theme-danger-border bg-surface-elevated";
          }

          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start justify-between p-3.5 rounded-xl border shadow-lg transition-all animate-fadeIn ${borderClass}`}
            >
              <div className="flex items-start space-x-2.5">
                <div className="mt-0.5">{icon}</div>
                <div>
                  {t.title && (
                    <div className="text-xs font-bold text-text-primary">{t.title}</div>
                  )}
                  <div className="text-xs text-text-secondary mt-0.5 leading-snug">
                    {t.message}
                  </div>
                </div>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg ml-2 hover:bg-surface-2 transition"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return {
    toast: {
      success: (msg: string, title?: string) => context.showToast("success", msg, title),
      error: (msg: string, title?: string) => context.showToast("error", msg, title),
      warning: (msg: string, title?: string) => context.showToast("warning", msg, title),
      info: (msg: string, title?: string) => context.showToast("info", msg, title),
    },
  };
};
