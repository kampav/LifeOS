import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DOMAINS = [
  { id: "health",    label: "Health",      color: "#10B981", icon: "favorite" },
  { id: "family",    label: "Family",      color: "#FF7F50", icon: "family_restroom" },
  { id: "education", label: "Education",   color: "#3B82F6", icon: "menu_book" },
  { id: "social",    label: "Social",      color: "#8B5CF6", icon: "group" },
  { id: "finance",   label: "Finance",     color: "#F59E0B", icon: "payments" },
  { id: "career",    label: "Career",      color: "#EC4899", icon: "work" },
  { id: "growth",    label: "Growth",      color: "#06B6D4", icon: "auto_awesome" },
  { id: "property",  label: "Property",    color: "#255766", icon: "apartment" },
  { id: "holiday",   label: "Holidays",    color: "#14B8A6", icon: "flight_takeoff" },
  { id: "community", label: "Community",   color: "#EF4444", icon: "diversity_3" },
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
