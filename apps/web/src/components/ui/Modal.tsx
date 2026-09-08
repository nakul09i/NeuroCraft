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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${widthClass} rounded-xl border-2 border-border bg-surface-0 shadow-brutal-lg p-6 overflow-hidden max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between pb-4 border-b-2 border-border">
            <div>
              {title && (
                <h3 className="text-base sm:text-lg font-black font-display text-text-primary tracking-tight uppercase">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-text-secondary mt-1 leading-normal">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-text-primary p-1.5 rounded-lg border-2 border-border bg-surface-1 hover:bg-surface-2 hover:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 transition ml-4 shrink-0"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">{children}</div>
      </div>
    </div>
  );
};
