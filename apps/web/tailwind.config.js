/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: {
          0: "var(--surface-0)",
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
          inset: "var(--surface-inset)",
          elevated: "var(--surface-elevated)",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        theme: {
          primary: "var(--primary)",
          "primary-hover": "var(--primary-hover)",
          "primary-subtle": "var(--primary-subtle)",
          "primary-border": "var(--primary-border)",
          "primary-text": "var(--primary-text)",
          success: "var(--success)",
          "success-subtle": "var(--success-subtle)",
          "success-border": "var(--success-border)",
          "success-text": "var(--success-text)",
          warning: "var(--warning)",
          "warning-subtle": "var(--warning-subtle)",
          "warning-border": "var(--warning-border)",
          "warning-text": "var(--warning-text)",
          danger: "var(--danger)",
          "danger-subtle": "var(--danger-subtle)",
          "danger-border": "var(--danger-border)",
          "danger-text": "var(--danger-text)",
          info: "var(--info)",
          "info-subtle": "var(--info-subtle)",
          "info-border": "var(--info-border)",
          "info-text": "var(--info-text)",
        },
        accent: {
          cyan: "var(--accent-cyan)",
          "cyan-subtle": "var(--accent-cyan-subtle)",
          purple: "var(--accent-purple)",
          "purple-subtle": "var(--accent-purple-subtle)",
        },
      },
      fontFamily: {
        display: ["Geist", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        sans: ["Geist", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderWidth: {
        DEFAULT: "1px",
        0: "0",
        1: "1px",
        2: "2px",
      },
      boxShadow: {
        "neu-sm": "var(--neu-raised-sm)",
        "neu-md": "var(--neu-raised-md)",
        "neu-lg": "var(--neu-raised-lg)",
        "neu-inset-sm": "var(--neu-inset-sm)",
        "neu-inset-md": "var(--neu-inset-md)",
        glow: "0 0 24px -4px rgba(56, 189, 248, 0.25)",
        "glow-purple": "0 0 24px -4px rgba(168, 85, 247, 0.25)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.97)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out forwards",
        fadeUp: "fadeUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        scaleIn: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        pulseSubtle: "pulseSubtle 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
