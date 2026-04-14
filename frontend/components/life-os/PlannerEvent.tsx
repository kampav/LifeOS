"use client";

export interface PlannerItem {
  id: string;
  title: string;
  domain?: string;
  item_type: string;
  start_at: string;
  end_at?: string;
  all_day?: boolean;
  is_non_movable?: boolean;
  priority?: string;
  completed?: boolean;
}

const DOMAIN_COLOURS: Record<string, string> = {
  health: "#10b981",
  finance: "#3b82f6",
  family: "#ec4899",
  social: "#8b5cf6",
  career: "#6366f1",
  growth: "#f59e0b",
  property: "#14b8a6",
};

interface Props {
  event: { resource: PlannerItem; title: string };
}

export function PlannerEvent({ event }: Props) {
  const item = event.resource;
  const colour = DOMAIN_COLOURS[item.domain || ""] || "#6b7280";

  return (
    <div
      className="text-xs rounded px-1 py-0.5 truncate"
      style={{ borderLeft: `3px solid ${colour}` }}
    >
      {item.is_non_movable && <span className="mr-1">🔒</span>}
      {item.completed && <span className="line-through opacity-60">{event.title}</span>}
      {!item.completed && event.title}
    </div>
  );
}
