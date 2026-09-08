import React from "react";

export interface ScoreRingProps {
  score: number; // 0 to 100
  size?: number; // diameter in px (default 120)
  strokeWidth?: number; // stroke width in px (default 10)
  label?: string;
  sublabel?: string;
  className?: string;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  className = "",
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  let strokeColor = "var(--success)";
  if (clampedScore > 70) {
    strokeColor = "var(--danger)";
  } else if (clampedScore > 40) {
    strokeColor = "var(--warning)";
  } else if (clampedScore > 20) {
    strokeColor = "var(--primary)";
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || "Security Posture Score"}
      className={`relative inline-flex flex-col items-center justify-center ${className}`}
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
        {/* Animated Progress Value */}
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
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-black font-mono tracking-tight text-text-primary">
          {clampedScore.toFixed(0)}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
          / 100
        </span>
      </div>

      {(label || sublabel) && (
        <div className="mt-2 text-center">
          {label && <div className="text-xs font-bold text-text-primary">{label}</div>}
          {sublabel && <div className="text-[11px] text-text-muted mt-0.5">{sublabel}</div>}
        </div>
      )}
    </div>
  );
};
