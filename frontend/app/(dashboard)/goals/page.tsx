"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi } from "@/lib/api";
import { DOMAINS, getDomain } from "@/lib/utils";
import { Plus, Target, CheckCircle2, Circle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  domain: z.string(),
  title: z.string().min(3),
  description: z.string().optional(),
  goal_type: z.enum(["outcome", "habit", "project", "learning"]),
  target_value: z.number().optional(),
  unit: z.string().optional(),
  target_date: z.string().optional(),
});

export default function GoalsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const { data: goals = [] } = useQuery({ queryKey: ["goals"], queryFn: () => goalsApi.list().then(r => Array.isArray(r.data) ? r.data : []), retry: false });
  const createGoal = useMutation({
    mutationFn: (data: Record<string, unknown>) => goalsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); setShowForm(false); reset(); },
  });
  const updateGoal = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => goalsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const filtered = filter === "all" ? goals : goals.filter((g: Record<string, unknown>) => g.domain === filter || g.status === filter);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-500 text-sm">{goals.filter((g: Record<string, unknown>) => g.status === "active").length} active goals</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {["all", "active", "completed", ...DOMAINS.map(d => d.id)].slice(0, 8).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filter === f ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* New goal form */}
      {showForm && (
        <form onSubmit={handleSubmit(d => createGoal.mutate(d as Record<string, unknown>))}
          className="bg-white rounded-2xl p-6 shadow-card mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">New Goal</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Domain</label>
              <select {...register("domain")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {DOMAINS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select {...register("goal_type")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="outcome">Outcome</option>
                <option value="habit">Habit</option>
                <option value="project">Project</option>
                <option value="learning">Learning</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Goal title</label>
            <input {...register("title")} placeholder="e.g. Run a 5K" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Target value</label>
              <input {...register("target_value", { valueAsNumber: true })} type="number" placeholder="5" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <input {...register("unit")} placeholder="km, kg, £..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Target date</label>
              <input {...register("target_date")} type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm">Cancel</button>
            <button type="submit" disabled={createGoal.isPending} className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">
              {createGoal.isPending ? "Saving…" : "Create Goal"}
            </button>
          </div>
        </form>
      )}

      {/* Goals list */}
      <div className="space-y-3">
        {filtered.map((goal: Record<string, unknown>) => {
          const domain = getDomain(goal.domain as string);
          const progress = goal.target_value ? Math.min(100, Math.round(((goal.current_value as number) / (goal.target_value as number)) * 100)) : 0;
          return (
            <div key={goal.id as string} className="bg-white rounded-2xl p-5 shadow-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  {goal.status === "completed"
                    ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{goal.title as string}</p>
                    {domain && <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 inline-block" style={{ background: domain.color + "20", color: domain.color }}>{domain.label}</span>}
                  </div>
                </div>
                {goal.target_date ? <span className="text-xs text-gray-400">{new Date(goal.target_date as string).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span> : null}
              </div>
              {goal.target_value ? (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>{goal.current_value as number} / {goal.target_value as number} {goal.unit as string}</span>
                    <span className="font-medium" style={{ color: domain?.color }}>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: domain?.color || "#6366F1" }} />
                  </div>
                </div>
              ) : null}
              {goal.status === "active" ? (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => updateGoal.mutate({ id: goal.id as string, data: { status: "completed" } })}
                    className="text-xs text-green-600 hover:text-green-700 font-medium">Mark complete</button>
                  <span className="text-gray-200">|</span>
                  <button onClick={() => updateGoal.mutate({ id: goal.id as string, data: { status: "paused" } })}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium">Pause</button>
                </div>
              ) : null}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No goals yet. Create your first goal above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
