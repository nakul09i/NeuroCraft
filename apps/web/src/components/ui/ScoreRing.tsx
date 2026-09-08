import React, { useEffect, useState } from "react";

export interface ScoreRingProps {
  score?: number | null; // 0 to 100, or null/undefined
  loading?: boolean;
  error?: boolean;
  size?: number; // diameter in px (default 120)
  strokeWidth?: number; // stroke width in px (default 10)
  label?: string;
  sublabel?: string;
  variant?: "posture" | "risk"; // posture (100 = best), risk (0 = best)
  className?: string;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  loading = false,
  error = false,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  variant = "posture",
  className = "",
}) => {
  // Safe number verification — NEVER allow NaN, undefined, or Infinity to pass through
  const isNumeric = typeof score === "number" && !isNaN(score) && isFinite(score);
  const targetScore = isNumeric ? Math.max(0, Math.min(100, Math.round(score!))) : null;

  // Animated score counter
  const [displayScore, setDisplayScore] = useState<number>(0);

  useEffect(() => {
    if (targetScore === null) {
      setDisplayScore(0);
      return;
    }

    let start = 0;
    const duration = 650; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(start + (targetScore - start) * ease);
      setDisplayScore(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [targetScore]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const validScore = targetScore !== null ? displayScore : 0;
  const strokeDashoffset = targetScore !== null
    ? circumference - (validScore / 100) * circumference
    : circumference;

  // Compute stroke color based on mode
  let strokeColor = "var(--border-strong)";

  if (targetScore !== null) {
    if (variant === "posture") {
      // Posture: higher is better
      if (validScore >= 75) {
        strokeColor = "var(--success)";
      } else if (validScore >= 50) {
        strokeColor = "var(--warning)";
      } else {
        strokeColor = "var(--danger)";
      }
    } else {
      // Risk: lower is better
      if (validScore <= 20) {
        strokeColor = "var(--success)";
      } else if (validScore <= 60) {
        strokeColor = "var(--warning)";
      } else {
        strokeColor = "var(--danger)";
      }
    }
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={targetScore ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || "Security Score"}
      className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
    >
      <svg width={size} height={size} className="rotate-[-90deg] transition-all">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--surface-2)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Animated Value Ring */}
        {targetScore !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
            fill="transparent"
            style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s ease" }}
          />
        )}

        {/* Loading Ring Shimmer */}
        {loading && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--primary)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference * 0.25} ${circumference * 0.75}`}
            strokeLinecap="butt"
            fill="transparent"
            className="animate-spin origin-center"
          />
        )}
      </svg>

      {/* Center Label Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {loading ? (
          <span className="text-xl font-mono text-text-muted animate-pulse">...</span>
        ) : error ? (
          <span className="text-sm font-black font-display text-danger">ERR</span>
        ) : targetScore !== null ? (
          <>
            <span className="text-3xl sm:text-4xl font-black font-display tracking-tight text-text-primary">
              {validScore}
            </span>
            <span className="text-[10px] uppercase font-bold font-mono tracking-widest text-text-muted">
              / 100
            </span>
          </>
        ) : (
          <>
            <span className="text-3xl font-black font-display text-text-muted">
              —
            </span>
            <span className="text-[9px] uppercase font-bold font-mono tracking-widest text-text-muted">
              Awaiting Analysis
            </span>
          </>
        )}
      </div>

      {(label || sublabel) && (
        <div className="mt-2.5 text-center">
          {label && (
            <div className="text-xs font-bold uppercase tracking-wider text-text-primary">
              {label}
            </div>
          )}
          {sublabel && (
            <div className="text-[11px] text-text-muted mt-0.5 font-mono">
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
