import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DOMAINS = [
  { id: "health",    label: "Health",      color: "#C8FF4D", icon: "Heart" },
  { id: "family",    label: "Family",      color: "#FFC558", icon: "Home" },
  { id: "education", label: "Education",   color: "#64B5FF", icon: "BookOpen" },
  { id: "social",    label: "Social",      color: "#F04DDE", icon: "Users" },
  { id: "finance",   label: "Finance",     color: "#8FF8A8", icon: "TrendingUp" },
  { id: "career",    label: "Career",      color: "#1787FF", icon: "Briefcase" },
  { id: "growth",    label: "Growth",      color: "#FF6A4A", icon: "Zap" },
  { id: "property",  label: "Property",    color: "#255766", icon: "Building" },
  { id: "holiday",   label: "Holidays",    color: "#EADFFF", icon: "Plane" },
  { id: "community", label: "Community",   color: "#0B0820", icon: "Globe" },
] as const;

export type DomainId = (typeof DOMAINS)[number]["id"];

export function getDomain(id: string) {
  return DOMAINS.find((d) => d.id === id);
}

export function formatScore(score: number) {
  if (score >= 80) return { label: "Thriving", color: "#C8FF4D" };
  if (score >= 60) return { label: "On Track", color: "#1787FF" };
  if (score >= 40) return { label: "Needs Work", color: "#FFC558" };
  return { label: "Attention", color: "#FF6A4A" };
}
