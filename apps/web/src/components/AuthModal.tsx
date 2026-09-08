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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-surface-0/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-xl p-7 overflow-hidden animate-scaleIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-1 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="text-center mb-6 pt-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-text-primary tracking-tight">
            {isLogin ? "Sign in to NeuroCraft" : "Create Security Account"}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {isLogin
              ? "Access persistent private scans, telemetry, and threat history"
              : "Isolated user tenant with cryptographic ownership"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-center space-x-2 text-danger text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  required
                  placeholder="Security Analyst"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-1/60 border border-border/70 text-xs text-text-primary placeholder:text-text-muted focus-ring shadow-xs transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" />
              <input
                type="email"
                required
                placeholder="analyst@enterprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-1/60 border border-border/70 text-xs text-text-primary placeholder:text-text-muted focus-ring shadow-xs transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-text-muted" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-1/60 border border-border/70 text-xs text-text-primary placeholder:text-text-muted focus-ring shadow-xs transition"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full text-xs font-medium py-2.5 shadow-xs"
            >
              {loading ? "Processing…" : isLogin ? "Sign In" : "Register"}
            </Button>
          </div>
        </form>

        <div className="mt-5 text-center text-xs text-text-secondary">
          {isLogin ? "Need an account?" : "Already registered?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-primary hover:underline font-medium ml-1"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};
