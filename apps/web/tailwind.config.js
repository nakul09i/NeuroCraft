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
        brand: {
          dark: "#080c14",
          card: "#0f172a",
          cardHover: "#172554",
          border: "#1e293b",
          cyan: "#06b6d4",
          cyanGlow: "#22d3ee",
          emerald: "#10b981",
          rose: "#f43f5e",
          amber: "#f59e0b",
          purple: "#8b5cf6",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
      boxShadow: {
        "cyan-glow": "0 0 25px -5px rgba(6, 182, 212, 0.3)",
        "emerald-glow": "0 0 25px -5px rgba(16, 185, 129, 0.3)",
        "rose-glow": "0 0 25px -5px rgba(244, 63, 94, 0.3)",
      },
    },
  },
  plugins: [],
}
