"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { habitsApi } from "@/lib/api";
import { DOMAINS, getDomain } from "@/lib/utils";
import { Plus, CheckCircle2, Circle, Flame } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  domain: z.string(),
  name: z.string().min(2),
  frequency: z.string(),
  target_time: z.string().optional(),
});

export default function HabitsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm({ resolver: zodResolver(schema) });

  const { data: habits = [] } = useQuery({ queryKey: ["habits"], queryFn: () => habitsApi.list().then(r => Array.isArray(r.data) ? r.data : []), retry: false });
  const createHabit = useMutation({
    mutationFn: (data: Record<string, unknown>) => habitsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["habits"] }); setShowForm(false); reset(); },
  });
  const logHabit = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => habitsApi.log(id, completed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Habits</h1>
          <p className="text-gray-500 text-sm">{habits.length} active habits</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> New Habit
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(d => createHabit.mutate(d as Record<string, unknown>))}
          className="bg-white rounded-2xl p-6 shadow-card mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">New Habit</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Domain</label>
              <select {...register("domain")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
              <select {...register("frequency")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="3x_week">3x per week</option>
                <option value="weekdays">Weekdays</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Habit name</label>
            <input {...register("name")} placeholder="e.g. 10,000 steps" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm">Cancel</button>
            <button type="submit" disabled={createHabit.isPending} className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">
              {createHabit.isPending ? "Saving…" : "Create Habit"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {habits.map((habit: Record<string, unknown>) => {
          const domain = getDomain(habit.domain as string);
          return (
            <div key={habit.id as string} className="bg-white rounded-2xl p-5 shadow-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => logHabit.mutate({ id: habit.id as string, completed: true })}
                  className="transition-transform hover:scale-110">
                  <CheckCircle2 className="w-6 h-6" style={{ color: domain?.color || "#6366F1" }} />
                </button>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{habit.name as string}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {domain && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: domain.color + "20", color: domain.color }}>{domain.label}</span>}
                    <span className="text-xs text-gray-400">{habit.frequency as string}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-orange-500">
                <Flame className="w-4 h-4" />
                <span className="font-bold text-sm">{(habit.current_streak as number) || 0}</span>
              </div>
            </div>
          );
        })}
        {habits.length === 0 && (
          <div className="text-center py-12">
            <Flame className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No habits yet. Build your first streak.</p>
          </div>
        )}
      </div>
    </div>
  );
}
