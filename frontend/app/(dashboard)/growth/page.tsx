"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { habitsApi, goalsApi, entriesApi } from "@/lib/api";
import { BookOpen, Target, Flame, Plus, CheckCircle2, Circle } from "lucide-react";

type Habit = { id: string; name: string; frequency: string; current_streak?: number; longest_streak?: number; domain?: string };
type Goal = { id: string; title: string; status: string; target_date?: string; current_value?: number; target_value?: number; unit?: string };
type Entry = { id: string; title?: string; entry_type?: string; notes?: string; logged_at: string; value?: number; unit?: string };

export default function GrowthPage() {
  const qc = useQueryClient();
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryForm, setEntryForm] = useState({ title: "", entry_type: "learning", notes: "", value: "" });

  const { data: habitsData } = useQuery({ queryKey: ["habits"], queryFn: () => habitsApi.list().then(r => r.data), staleTime: 60_000 });
  const { data: goalsData = [] } = useQuery({ queryKey: ["goals", "growth"], queryFn: () => goalsApi.list({ domain: "growth" }).then(r => Array.isArray(r.data) ? r.data : []), staleTime: 120_000 });
  const { data: entriesData } = useQuery({ queryKey: ["entries", "growth"], queryFn: () => entriesApi.list({ domain: "growth", limit: 10 }).then(r => r.data), staleTime: 60_000 });

  const logHabit = useMutation({ mutationFn: (id: string) => habitsApi.log(id, true) });

  const addEntry = useMutation({
    mutationFn: () => entriesApi.create({ ...entryForm, domain: "growth", value: entryForm.value ? parseFloat(entryForm.value) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["entries", "growth"] }); setShowAddEntry(false); setEntryForm({ title: "", entry_type: "learning", notes: "", value: "" }); },
  });

  const habits = ((habitsData as { habits?: Habit[] })?.habits || []).filter(h => !h.domain || h.domain === "growth");
  const goals = goalsData as Goal[];
  const entries = ((entriesData as { entries?: Entry[] })?.entries || (Array.isArray(entriesData) ? entriesData : [])) as Entry[];
  const activeGoals = goals.filter(g => g.status === "active");
  const totalStreak = habits.reduce((sum, h) => sum + (h.current_streak || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center"><BookOpen className="w-5 h-5 text-emerald-600" /></div>
          <h1 className="text-2xl font-bold text-gray-900">Growth</h1>
        </div>
        <button onClick={() => setShowAddEntry(s => !s)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition">
          <Plus className="w-4 h-4" /> Log
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-card text-center">
          <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{totalStreak}</p>
          <p className="text-xs text-gray-400">Total streak days</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center">
          <Target className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{activeGoals.length}</p>
          <p className="text-xs text-gray-400">Active goals</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center">
          <BookOpen className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{entries.length}</p>
          <p className="text-xs text-gray-400">Recent entries</p>
        </div>
      </div>

      {/* Add entry form */}
      {showAddEntry && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Log Growth Entry</h2>
          <div className="grid grid-cols-2 gap-3">
            <select value={entryForm.entry_type} onChange={e => setEntryForm(f => ({ ...f, entry_type: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {["learning","reflection","book","course","skill","mindset","other"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <input placeholder="Title (optional)" value={entryForm.title} onChange={e => setEntryForm(f => ({ ...f, title: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <textarea placeholder="Notes" value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2 resize-none" rows={2} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addEntry.mutate()} disabled={addEntry.isPending} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-emerald-700 transition">{addEntry.isPending ? "Saving…" : "Save"}</button>
            <button onClick={() => setShowAddEntry(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Habits */}
      {habits.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> Habits</h2>
          <div className="space-y-2">
            {habits.map(h => (
              <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{h.name}</p>
                  <p className="text-xs text-gray-400">{h.frequency} · {h.current_streak || 0}d streak</p>
                </div>
                <button onClick={() => logHabit.mutate(h.id)} className="flex items-center gap-1 text-xs text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg transition">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Done
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals */}
      {activeGoals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" /> Goals</h2>
          <div className="space-y-4">
            {activeGoals.map(g => {
              const pct = g.target_value ? Math.min(100, ((g.current_value || 0) / g.target_value) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">{g.title}</span>
                    <span className="text-xs text-gray-400">{g.current_value ?? 0}{g.unit ? ` ${g.unit}` : ""} / {g.target_value ?? "?"}{g.unit ? ` ${g.unit}` : ""}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-2 bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  {g.target_date && <p className="text-xs text-gray-400 mt-0.5">Due {g.target_date}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent entries */}
      {entries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Recent Entries</h2>
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={e.id || i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <Circle className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-800">{e.title || e.entry_type}</p>
                  {e.notes && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{e.notes}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">{new Date(e.logged_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
