"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Flag, Link2 } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  domain?: string;
  priority: "low" | "medium" | "high" | "critical";
  due_date?: string;
  goal_id?: string;
  status: string;
  tags?: string[];
}

interface Props {
  task: Task;
  onClick?: (task: Task) => void;
}

const PRIORITY_COLOURS = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-yellow-400",
  low: "bg-gray-300",
};

const DOMAIN_COLOURS: Record<string, string> = {
  health: "bg-emerald-100 text-emerald-700",
  finance: "bg-blue-100 text-blue-700",
  family: "bg-pink-100 text-pink-700",
  social: "bg-purple-100 text-purple-700",
  career: "bg-indigo-100 text-indigo-700",
  growth: "bg-amber-100 text-amber-700",
  property: "bg-teal-100 text-teal-700",
};

function formatDate(d?: string) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return d;
  }
}

export function KanbanCard({ task, onClick }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const domainCls = DOMAIN_COLOURS[task.domain || ""] || "bg-gray-100 text-gray-600";
  const priorityCls = PRIORITY_COLOURS[task.priority] || PRIORITY_COLOURS.medium;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(task)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      data-testid="habit-item"
    >
      {/* Priority dot */}
      <div className="flex items-start gap-2">
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityCls}`} />
        <p className="text-sm font-medium text-gray-900 flex-1 leading-snug">{task.title}</p>
      </div>

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap gap-1.5 items-center">
        {task.domain && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${domainCls}`}>
            {task.domain}
          </span>
        )}
        {task.due_date && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            {formatDate(task.due_date)}
          </span>
        )}
        {task.goal_id && (
          <span className="text-gray-400" title="Linked to goal">
            <Link2 className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );
}
