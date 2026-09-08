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
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
}
