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
        primary: { DEFAULT: "#6366F1", light: "#EEF2FF", dark: "#4F46E5" },
        domain: {
          health:    "#10B981",
          family:    "#F59E0B",
          education: "#3B82F6",
          social:    "#EC4899",
          finance:   "#059669",
          career:    "#8B5CF6",
          growth:    "#F97316",
          property:  "#6B7280",
          holiday:   "#14B8A6",
          community: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Google Sans", "Segoe UI", "Roboto", "sans-serif"],
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
