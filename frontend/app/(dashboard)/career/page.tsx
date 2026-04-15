"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi, entriesApi } from "@/lib/api";
import { Briefcase, Target, Plus, TrendingUp, Star, Circle } from "lucide-react";

type Goal = { id: string; title: string; status: string; target_date?: string; current_value?: number; target_value?: number; unit?: string };
type Entry = { id: string; title?: string; entry_type?: string; notes?: string; logged_at: string; value?: number };

const CAREER_ENTRY_TYPES = ["achievement","skill","milestone","feedback","networking","learning","reflection","other"];
const ENTRY_COLOR: Record<string, string> = { achievement: "text-yellow-500", skill: "text-blue-500", milestone: "text-green-500", feedback: "text-purple-500", networking: "text-pink-500", learning: "text-indigo-500", reflection: "text-gray-400", other: "text-gray-400" };

export default function CareerPage() {
  const qc = useQueryClient();
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryForm, setEntryForm] = useState({ title: "", entry_type: "achievement", notes: "" });

  const { data: goalsData = [] } = useQuery({ queryKey: ["goals", "career"], queryFn: () => goalsApi.list({ domain: "career" }).then(r => Array.isArray(r.data) ? r.data : []), staleTime: 120_000 });
  const { data: entriesData } = useQuery({ queryKey: ["entries", "career"], queryFn: () => entriesApi.list({ domain: "career", limit: 15 }).then(r => r.data), staleTime: 60_000 });

  const addEntry = useMutation({
    mutationFn: () => entriesApi.create({ ...entryForm, domain: "career" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["entries", "career"] }); setShowAddEntry(false); setEntryForm({ title: "", entry_type: "achievement", notes: "" }); },
  });

  const goals = goalsData as Goal[];
  const entries = ((entriesData as { entries?: Entry[] })?.entries || (Array.isArray(entriesData) ? entriesData : [])) as Entry[];
  const activeGoals = goals.filter(g => g.status === "active");

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center"><Briefcase className="w-5 h-5 text-amber-600" /></div>
          <h1 className="text-2xl font-bold text-gray-900">Career</h1>
        </div>
        <button onClick={() => setShowAddEntry(s => !s)} className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-700 transition">
          <Plus className="w-4 h-4" /> Log
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Target className="w-5 h-5 text-amber-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{activeGoals.length}</p><p className="text-xs text-gray-400">Active goals</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{entries.filter(e => e.entry_type === "achievement").length}</p><p className="text-xs text-gray-400">Achievements</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{entries.length}</p><p className="text-xs text-gray-400">Total entries</p></div>
      </div>

      {showAddEntry && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Log Career Entry</h2>
          <div className="grid grid-cols-2 gap-3">
            <select value={entryForm.entry_type} onChange={e => setEntryForm(f => ({ ...f, entry_type: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {CAREER_ENTRY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <input placeholder="Title" value={entryForm.title} onChange={e => setEntryForm(f => ({ ...f, title: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <textarea placeholder="Notes / details" value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2 resize-none" rows={2} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addEntry.mutate()} disabled={addEntry.isPending} className="px-4 py-2 bg-amber-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-amber-700 transition">{addEntry.isPending ? "Saving…" : "Save"}</button>
            <button onClick={() => setShowAddEntry(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {activeGoals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-amber-500" /> Career Goals</h2>
          <div className="space-y-4">
            {activeGoals.map(g => {
              const pct = g.target_value ? Math.min(100, ((g.current_value || 0) / g.target_value) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">{g.title}</span>
                    <span className="text-xs text-gray-400">{g.target_date ? `Due ${g.target_date}` : `${Math.round(pct)}%`}</span>
                  </div>
                  {g.target_value != null && <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-2 bg-amber-400 rounded-full" style={{ width: `${pct}%` }} /></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Career Log</h2>
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={e.id || i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <Circle className={`w-3 h-3 flex-shrink-0 mt-1 ${ENTRY_COLOR[e.entry_type || "other"]}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-800">{e.title || e.entry_type}</p>
                    <span className="text-xs capitalize text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{e.entry_type}</span>
                  </div>
                  {e.notes && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{e.notes}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">{new Date(e.logged_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
