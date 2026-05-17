import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#6C3AFF", light: "#E7DEFF", dark: "#5304E7" },
        domain: {
          health:    "#10B981",
          family:    "#FF7F50",
          education: "#3B82F6",
          social:    "#8B5CF6",
          finance:   "#F59E0B",
          career:    "#EC4899",
          growth:    "#06B6D4",
          property:  "#6B7280",
          holiday:   "#14B8A6",
          community: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Google Sans", "Segoe UI", "Roboto", "sans-serif"],
        serifDisplay: ["Instrument Serif", "serif"],
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
      },
      boxShadow: {
        card: "0 0 0 1px rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.08)",
        "card-hover": "0 0 0 1px rgba(255,255,255,0.12), 0 8px 30px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
