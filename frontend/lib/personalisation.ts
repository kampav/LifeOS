/**
 * Personalisation helpers — injects CSS variables and persists preferences.
 */

export interface PersonalisationPrefs {
  coach_tone: number;
  detail_level: number;
  domain_weights: Record<string, number>;
  alert_cadence: string;
  accent_colour: string;
  layout_density: string;
  font_size: string;
  domain_config?: Record<string, {
    enabled?: boolean;
    label?: string;
    outcome?: string;
    widgets?: string[];
    quick_captures?: string[];
    nudge?: string;
  }>;
  nudge_preferences?: {
    enabled?: boolean;
    max_per_day?: number;
    quiet_hours?: { start?: string; end?: string };
    channels?: string[];
  };
}

export const DEFAULT_PREFS: PersonalisationPrefs = {
  coach_tone: 2,
  detail_level: 3,
  domain_weights: {
    health: 5, finance: 5, family: 5, social: 5, career: 5,
    growth: 5, property: 5, holiday: 5, community: 5, education: 5,
  },
  alert_cadence: "normal",
  accent_colour: "#6366F1",
  layout_density: "comfortable",
  font_size: "medium",
  domain_config: {},
  nudge_preferences: { enabled: true, max_per_day: 3, quiet_hours: { start: "21:30", end: "07:00" }, channels: ["in_app"] },
};

// ── CSS variable injection ──────────────────────────────────────────────────

export function applyPersonalisation(prefs: Partial<PersonalisationPrefs>): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const colour = prefs.accent_colour || DEFAULT_PREFS.accent_colour;
  root.style.setProperty("--accent", colour);
  root.style.setProperty("--accent-rgba-20", hexToRgba(colour, 0.2));
  root.style.setProperty("--accent-rgba-10", hexToRgba(colour, 0.1));

  const density = prefs.layout_density || DEFAULT_PREFS.layout_density;
  const densityMap: Record<string, string> = {
    compact: "0.75rem",
    comfortable: "1rem",
    spacious: "1.5rem",
  };
  root.style.setProperty("--spacing-base", densityMap[density] || densityMap.comfortable);

  const fontSize = prefs.font_size || DEFAULT_PREFS.font_size;
  const fontMap: Record<string, string> = {
    small: "13px",
    medium: "15px",
    large: "17px",
  };
  root.style.setProperty("--font-size-base", fontMap[fontSize] || fontMap.medium);
}

// ── Debounced preference save ─────────────────────────────────────────────

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

export function savePreference(key: keyof PersonalisationPrefs, value: unknown): void {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      const { api } = await import("@/lib/api");
      await api.patch("/users/me/personalisation", { [key]: value });
    } catch {
      // fail silently — preference is cosmetic
    }
  }, 1000);
}

// ── Utilities ────────────────────────────────────────────────────────────

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
