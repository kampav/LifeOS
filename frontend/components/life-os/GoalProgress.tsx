"use client";
import { getDomain } from "@/lib/utils";

interface Goal {
  id: string;
  title: string;
  domain: string;
  current_value: number;
  target_value?: number;
  unit?: string;
  status: string;
}

export function GoalProgress({ goals }: { goals: Goal[] }) {
  const active = goals.filter(g => g.status === "active").slice(0, 5);
  if (!active.length) return null;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-card">
      <h3 className="font-semibold text-gray-900 mb-4">Active Goals</h3>
      <div className="space-y-4">
        {active.map(goal => {
          const domain = getDomain(goal.domain);
          const pct = goal.target_value ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)) : 0;
          return (
            <div key={goal.id}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-gray-800 font-medium">{goal.title}</span>
                <span className="text-xs font-semibold" style={{ color: domain?.color || "#6366F1" }}>{pct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: domain?.color || "#6366F1" }} />
                </div>
                {goal.target_value && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {goal.current_value}/{goal.target_value} {goal.unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
