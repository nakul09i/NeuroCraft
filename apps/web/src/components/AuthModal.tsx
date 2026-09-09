import React, { useState } from "react";
import { X, Lock, Mail, User as UserIcon, ShieldAlert } from "lucide-react";
import { Button } from "./ui/Button";
import { api } from "../api";
import { UserProfile } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login(email, password);
        onSuccess(res.user);
      } else {
        const res = await api.signup(email, password, displayName);
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-surface-elevated border border-border rounded-3xl shadow-2xl p-8 overflow-hidden animate-scaleIn"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-text-muted hover:text-text-primary p-2 rounded-xl bg-surface-1 hover:bg-surface-2 transition-colors focus-ring"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="text-center mb-6 pt-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            {isLogin ? "Sign in to NeuroCraft" : "Create Security Account"}
          </h2>
          <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
            {isLogin
              ? "Access persistent private scans, telemetry, and threat history"
              : "Isolated tenant with cryptographic provenance ownership"}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-danger/10 border border-danger/25 flex items-center space-x-2.5 text-danger text-xs sm:text-sm">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="Security Analyst"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-inset border border-border text-sm text-text-primary placeholder:text-text-muted focus-ring shadow-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="email"
                required
                placeholder="analyst@enterprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-inset border border-border text-sm text-text-primary placeholder:text-text-muted focus-ring shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-inset border border-border text-sm text-text-primary placeholder:text-text-muted focus-ring shadow-xs"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full text-base font-semibold py-3 shadow-md"
            >
              {loading ? "Processing…" : isLogin ? "Sign In" : "Register"}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-text-secondary">
          {isLogin ? "Need an account?" : "Already registered?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-primary hover:underline font-semibold ml-1"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};
