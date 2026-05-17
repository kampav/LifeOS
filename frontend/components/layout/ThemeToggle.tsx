"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.style.colorScheme = mode;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const isDark = mode === "dark";

  useEffect(() => {
    const stored = window.localStorage.getItem("lifeos-theme") as ThemeMode | null;
    const preferred: ThemeMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const nextMode = stored === "dark" || stored === "light" ? stored : preferred;
    setMode(nextMode);
    applyTheme(nextMode);
  }, []);

  function toggleTheme() {
    const nextMode: ThemeMode = isDark ? "light" : "dark";
    setMode(nextMode);
    window.localStorage.setItem("lifeos-theme", nextMode);
    applyTheme(nextMode);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`material-toggle group relative inline-flex items-center rounded-full border border-white/70 bg-white/70 p-1 shadow-lg shadow-blue-950/10 backdrop-blur-xl transition hover:-translate-y-0.5 dark:bg-white/15 ${
        compact ? "h-10 w-16" : "h-11 w-full justify-between px-2"
      }`}
    >
      {!compact && (
        <span className="pl-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-300">
          {isDark ? "Dark" : "Light"}
        </span>
      )}
      <span
        className={`grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(135deg,#1787FF,#64B5FF)] text-white shadow-lg shadow-blue-500/30 transition-transform dark:bg-[linear-gradient(135deg,#FFC558,#FF6A4A)] dark:text-slate-950 ${
          isDark ? "translate-x-0" : compact ? "translate-x-6" : "translate-x-0"
        }`}
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
    </button>
  );
}
