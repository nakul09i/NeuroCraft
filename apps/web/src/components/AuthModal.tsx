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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fadeIn">
      <div className="relative w-full max-w-md bg-surface-0 border-2 border-border rounded-xl shadow-brutal-lg p-6 overflow-hidden animate-scaleIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-primary p-1 rounded-md border-2 border-border bg-surface-1 hover:bg-surface-2 hover:shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 transition"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Title */}
        <div className="text-center mb-6 pt-2">
          <h2 className="text-xl sm:text-2xl font-black font-display text-text-primary tracking-tight uppercase">
            {isLogin ? "SIGN IN TO NEUROCRAFT" : "CREATE SECURITY ACCOUNT"}
          </h2>
          <p className="text-xs text-text-secondary mt-1 font-sans">
            {isLogin
              ? "Access persistent private scans, telemetry, and threat history"
              : "Isolated user tenant with cryptographic ownership"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 border-2 border-danger flex items-center space-x-2 text-danger text-xs font-mono font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-mono font-extrabold uppercase text-text-primary mb-1">
                DISPLAY NAME
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-text-primary stroke-[2.2]" />
                <input
                  type="text"
                  required
                  placeholder="Security Analyst"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-1 border-2 border-border text-xs font-bold font-mono text-text-primary placeholder:text-text-muted focus-ring shadow-[2px_2px_0px_var(--border)] transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-extrabold uppercase text-text-primary mb-1">
              EMAIL ADDRESS
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-text-primary stroke-[2.2]" />
              <input
                type="email"
                required
                placeholder="analyst@enterprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-1 border-2 border-border text-xs font-bold font-mono text-text-primary placeholder:text-text-muted focus-ring shadow-[2px_2px_0px_var(--border)] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-extrabold uppercase text-text-primary mb-1">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-text-primary stroke-[2.2]" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-1 border-2 border-border text-xs font-bold font-mono text-text-primary placeholder:text-text-muted focus-ring shadow-[2px_2px_0px_var(--border)] transition"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full text-xs font-black uppercase tracking-wider py-3 shadow-brutal"
            >
              {loading ? "PROCESSING..." : isLogin ? "SIGN IN →" : "REGISTER →"}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs font-mono text-text-secondary">
          {isLogin ? "Need an account?" : "Already registered?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-primary hover:underline font-extrabold uppercase ml-1"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};
