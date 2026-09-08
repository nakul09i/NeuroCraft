import React, { useEffect, useState } from "react";

export interface ScoreRingProps {
  score?: number | null; // 0 to 100, or null/undefined
  loading?: boolean;
  error?: boolean;
  size?: number; // diameter in px (default 130)
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
  size = 130,
  strokeWidth = 10,
  label,
  sublabel,
  variant = "posture",
  className = "",
}) => {
  // Safe number verification — NEVER allow NaN, undefined, null, or Infinity to pass through
  const isNumeric = typeof score === "number" && !isNaN(score) && isFinite(score);
  const targetScore = isNumeric ? Math.max(0, Math.min(100, Math.round(score!))) : null;

  // Calm animated score counter (0 -> targetScore)
  const [displayScore, setDisplayScore] = useState<number>(0);

  useEffect(() => {
    if (targetScore === null) {
      setDisplayScore(0);
      return;
    }

    let start = 0;
    const duration = 600; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Clean easeOutCubic
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

  // Compute elegant semantic stroke color
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
      if (validScore <= 25) {
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
        {/* Ambient Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--surface-2)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Animated Active Value Ring */}
        {targetScore !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
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
            strokeLinecap="round"
            fill="transparent"
            className="animate-spin origin-center opacity-50"
          />
        )}
      </svg>

      {/* Center Label Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2 text-center">
        {loading ? (
          <div className="w-8 h-8 rounded-full bg-surface-2 animate-pulse" />
        ) : error ? (
          <span className="text-xs font-semibold text-danger">Unavailable</span>
        ) : targetScore !== null ? (
          <>
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary leading-none">
              {validScore}
            </span>
            <span className="text-[11px] font-medium text-text-muted mt-1">
              / 100
            </span>
          </>
        ) : (
          <>
            <span className="text-2xl font-bold text-text-muted leading-none">
              —
            </span>
            <span className="text-[10px] text-text-muted mt-1 leading-tight">
              No security score yet
            </span>
          </>
        )}
      </div>

      {(label || sublabel) && (
        <div className="mt-3 text-center">
          {label && (
            <div className="text-xs font-semibold text-text-primary tracking-tight">
              {label}
            </div>
          )}
          {sublabel && (
            <div className="text-[11px] text-text-muted mt-0.5">
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
