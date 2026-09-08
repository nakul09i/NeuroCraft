import React, { useEffect, useRef } from "react";

export interface HeroBackgroundProps {
  className?: string;
  showNodes?: boolean;
}

export const HeroBackground: React.FC<HeroBackgroundProps> = ({
  className = "",
  showNodes = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.setProperty("--mouse-x", `${x}px`);
        el.style.setProperty("--mouse-y", `${y}px`);
        rafId = null;
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      style={
        {
          "--mouse-x": "50%",
          "--mouse-y": "30%",
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      {/* 1. Subtle Perspective Grid */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* 2. Ambient Gradient Mesh Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[480px] h-[480px] rounded-full bg-primary/10 dark:bg-primary/15 blur-[100px] animate-mesh" />
      <div
        className="absolute bottom-[-15%] left-[-5%] w-[420px] h-[420px] rounded-full bg-purple-500/10 dark:bg-purple-500/15 blur-[110px] animate-mesh"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute top-[30%] left-[25%] w-[320px] h-[320px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[90px] animate-mesh"
        style={{ animationDelay: "-3s" }}
      />

      {/* 3. Mouse-Reactive Subtle Radial Spotlight */}
      <div
        className="absolute inset-0 opacity-40 transition-opacity duration-500"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(56, 189, 248, 0.08), transparent 80%)`,
        }}
      />

      {/* 4. Constellation of Floating Security Telemetry Nodes */}
      {showNodes && (
        <svg
          className="absolute inset-0 w-full h-full opacity-30 dark:opacity-40"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Connective security vectors */}
          <line x1="15%" y1="20%" x2="35%" y2="40%" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="35%" y1="40%" x2="65%" y2="30%" stroke="url(#lineGrad)" strokeWidth="1" />
          <line x1="65%" y1="30%" x2="85%" y2="55%" stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="35%" y1="40%" x2="45%" y2="75%" stroke="url(#lineGrad)" strokeWidth="1" />

          {/* Orbital node elements */}
          <circle cx="15%" cy="20%" r="3" fill="var(--primary)" className="animate-pulse" />
          <circle cx="35%" cy="40%" r="4" fill="var(--primary)" />
          <circle cx="35%" cy="40%" r="8" fill="none" stroke="var(--primary)" strokeWidth="1" opacity="0.3" />
          <circle cx="65%" cy="30%" r="3.5" fill="#a855f7" className="animate-pulse" />
          <circle cx="85%" cy="55%" r="3" fill="#10b981" />
          <circle cx="45%" cy="75%" r="3.5" fill="var(--primary)" opacity="0.8" />
        </svg>
      )}
    </div>
  );
};
