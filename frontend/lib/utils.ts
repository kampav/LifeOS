import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DOMAINS = [
  { id: "health",    label: "Health",      color: "#10B981", icon: "Heart" },
  { id: "family",    label: "Family",      color: "#F59E0B", icon: "Home" },
  { id: "education", label: "Education",   color: "#3B82F6", icon: "BookOpen" },
  { id: "social",    label: "Social",      color: "#EC4899", icon: "Users" },
  { id: "finance",   label: "Finance",     color: "#059669", icon: "TrendingUp" },
  { id: "career",    label: "Career",      color: "#8B5CF6", icon: "Briefcase" },
  { id: "growth",    label: "Growth",      color: "#F97316", icon: "Zap" },
  { id: "property",  label: "Property",    color: "#6B7280", icon: "Building" },
  { id: "holiday",   label: "Holidays",    color: "#14B8A6", icon: "Plane" },
  { id: "community", label: "Community",   color: "#EF4444", icon: "Globe" },
] as const;

export type DomainId = (typeof DOMAINS)[number]["id"];

export function getDomain(id: string) {
  return DOMAINS.find((d) => d.id === id);
}

export function formatScore(score: number) {
  if (score >= 80) return { label: "Thriving", color: "#10B981" };
  if (score >= 60) return { label: "On Track", color: "#6366F1" };
  if (score >= 40) return { label: "Needs Work", color: "#F59E0B" };
  return { label: "Attention", color: "#EF4444" };
}
