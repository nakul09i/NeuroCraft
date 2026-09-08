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
        className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => {
          let icon = <Info className="w-5 h-5 text-primary shrink-0" />;
          let borderClass = "border-primary/30 bg-surface-0";

          if (t.type === "success") {
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
            borderClass = "border-emerald-500/30 bg-surface-0";
          } else if (t.type === "warning") {
            icon = <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
            borderClass = "border-amber-500/30 bg-surface-0";
          } else if (t.type === "error") {
            icon = <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
            borderClass = "border-rose-500/30 bg-surface-0";
          }

          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start justify-between p-4 rounded-2xl border neu-raised-md transition-all animate-fadeIn ${borderClass}`}
            >
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">{icon}</div>
                <div>
                  {t.title && (
                    <div className="text-sm font-bold text-text-primary">{t.title}</div>
                  )}
                  <div className="text-xs sm:text-sm text-text-secondary mt-0.5 leading-snug">
                    {t.message}
                  </div>
                </div>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="text-text-muted hover:text-text-primary p-1.5 rounded-xl neu-button ml-2 transition"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
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
      warning: (msg: string, title?: string) => context.showToast("warning", msg, title),
      error: (msg: string, title?: string) => context.showToast("error", msg, title),
      info: (msg: string, title?: string) => context.showToast("info", msg, title),
    },
  };
};
