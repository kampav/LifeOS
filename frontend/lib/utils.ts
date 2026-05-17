import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DOMAINS = [
  { id: "health",    label: "Health",      color: "#16A34A", icon: "Heart" },
  { id: "family",    label: "Family",      color: "#D97706", icon: "Home" },
  { id: "education", label: "Education",   color: "#2563EB", icon: "BookOpen" },
  { id: "social",    label: "Social",      color: "#DB2777", icon: "Users" },
  { id: "finance",   label: "Finance",     color: "#059669", icon: "TrendingUp" },
  { id: "career",    label: "Career",      color: "#1787FF", icon: "Briefcase" },
  { id: "growth",    label: "Growth",      color: "#EA580C", icon: "Zap" },
  { id: "property",  label: "Property",    color: "#255766", icon: "Building" },
  { id: "holiday",   label: "Holidays",    color: "#0891B2", icon: "Plane" },
  { id: "community", label: "Community",   color: "#7C3AED", icon: "Globe" },
] as const;

export type DomainId = (typeof DOMAINS)[number]["id"];

export function getDomain(id: string) {
  return DOMAINS.find((d) => d.id === id);
}

export function formatScore(score: number) {
  if (score >= 80) return { label: "Thriving", color: "#16A34A" };
  if (score >= 60) return { label: "On Track", color: "#1787FF" };
  if (score >= 40) return { label: "Needs Work", color: "#D97706" };
  return { label: "Attention", color: "#DC2626" };
}
