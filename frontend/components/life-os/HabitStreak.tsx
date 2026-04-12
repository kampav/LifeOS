"use client";
import { useQuery } from "@tanstack/react-query";
import { habitsApi } from "@/lib/api";
import { getDomain } from "@/lib/utils";
import { subDays, format, parseISO, eachDayOfInterval } from "date-fns";
import { Flame } from "lucide-react";

interface Props { habitId: string; habitName: string; domain: string; streak: number; }

export function HabitStreak({ habitId, habitName, domain, streak }: Props) {
  const d = getDomain(domain);
  const { data: history = [] } = useQuery({
    queryKey: ["habit-history", habitId],
    queryFn: () => habitsApi.history(habitId, 84).then(r => r.data),
    staleTime: 300_000,
  });

  const completedDates = new Set(history.filter((h: Record<string, unknown>) => h.completed).map((h: Record<string, unknown>) => h.logged_date as string));
  const today = new Date();
  const days = eachDayOfInterval({ start: subDays(today, 83), end: today });

  // Group into weeks
  const weeks: Date[][] = [];
  let week: Date[] = [];
  days.forEach((day, i) => {
    week.push(day);
    if (week.length === 7 || i === days.length - 1) { weeks.push(week); week = []; }
  });

  return (
    <div className="bg-white rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{habitName}</p>
          {d && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium mt-0.5 inline-block" style={{ background: d.color + "20", color: d.color }}>{d.label}</span>}
        </div>
        <div className="flex items-center gap-1 text-orange-500">
          <Flame className="w-4 h-4" />
          <span className="font-bold text-sm">{streak}</span>
          <span className="text-xs text-gray-400">day streak</span>
        </div>
      </div>

      {/* Heatmap */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((wk, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {wk.map(day => {
              const key = format(day, "yyyy-MM-dd");
              const done = completedDates.has(key);
              const isToday = key === format(today, "yyyy-MM-dd");
              return (
                <div key={key}
                  title={`${format(day, "MMM d")}: ${done ? "Done" : "Missed"}`}
                  className={`w-3.5 h-3.5 rounded-sm transition-colors ${isToday ? "ring-1 ring-gray-400" : ""}`}
                  style={{ background: done ? d?.color || "#6366F1" : "#F3F4F6", opacity: done ? 1 : 0.8 }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-400">12 weeks ago</span>
        <span className="text-xs text-gray-400">Today</span>
      </div>
    </div>
  );
}
