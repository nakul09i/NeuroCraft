import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let widthClass = "max-w-md";
  if (maxWidth === "sm") widthClass = "max-w-sm";
  if (maxWidth === "lg") widthClass = "max-w-lg";
  if (maxWidth === "xl") widthClass = "max-w-xl";
  if (maxWidth === "2xl") widthClass = "max-w-2xl";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${widthClass} rounded-2xl border border-border bg-surface-elevated shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between pb-4 border-b border-border/60">
            <div>
              {title && (
                <h3 className="text-base font-bold text-text-primary tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-text-secondary mt-0.5 leading-normal">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-2 transition ml-4"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">{children}</div>
      </div>
    </div>
  );
};
