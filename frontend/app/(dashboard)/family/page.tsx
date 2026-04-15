"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { importantDatesApi, goalsApi, entriesApi } from "@/lib/api";
import { Heart, Plus, Calendar, Star, Cake, Trash2 } from "lucide-react";

type ImportantDate = { id: string; title: string; date: string; category: string; domain?: string; recurring: boolean; notes?: string; next_occurrence?: string; days_until?: number };
type Goal = { id: string; title: string; status: string; current_value?: number; target_value?: number; target_date?: string };

const CATEGORIES = ["birthday","anniversary","deadline","appointment","holiday","other"];
const CAT_ICON: Record<string, typeof Cake> = { birthday: Cake, anniversary: Heart, holiday: Star };
const CAT_COLOR: Record<string, string> = { birthday: "text-pink-500", anniversary: "text-red-500", holiday: "text-amber-500", deadline: "text-orange-500", appointment: "text-blue-500", other: "text-gray-400" };

export default function FamilyPage() {
  const qc = useQueryClient();
  const [showAddDate, setShowAddDate] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [dateForm, setDateForm] = useState({ title: "", date: "", category: "birthday", recurring: true, notes: "" });
  const [entryForm, setEntryForm] = useState({ title: "", entry_type: "event", notes: "" });

  const { data: datesData } = useQuery({ queryKey: ["important-dates", "family"], queryFn: () => importantDatesApi.list({ domain: "family" }).then(r => r.data), staleTime: 120_000 });
  const { data: upcomingData } = useQuery({ queryKey: ["important-dates-upcoming", "family"], queryFn: () => importantDatesApi.upcoming(90, "family").then(r => r.data), staleTime: 120_000 });
  const { data: goalsData = [] } = useQuery({ queryKey: ["goals", "family"], queryFn: () => goalsApi.list({ domain: "family" }).then(r => Array.isArray(r.data) ? r.data : []), staleTime: 120_000 });
  const { data: entriesData } = useQuery({ queryKey: ["entries", "family"], queryFn: () => entriesApi.list({ domain: "family", limit: 8 }).then(r => r.data), staleTime: 60_000 });

  const createDate = useMutation({
    mutationFn: () => importantDatesApi.create({ ...dateForm, domain: "family" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["important-dates"] }); setShowAddDate(false); setDateForm({ title: "", date: "", category: "birthday", recurring: true, notes: "" }); },
  });
  const deleteDate = useMutation({ mutationFn: (id: string) => importantDatesApi.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["important-dates"] }) });
  const addEntry = useMutation({
    mutationFn: () => entriesApi.create({ ...entryForm, domain: "family" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["entries", "family"] }); setShowAddEntry(false); setEntryForm({ title: "", entry_type: "event", notes: "" }); },
  });

  const allDates = (datesData?.dates as ImportantDate[]) || [];
  const upcoming = (upcomingData?.upcoming as ImportantDate[]) || [];
  const goals = (goalsData as Goal[]).filter(g => g.status === "active");
  const entries = ((entriesData as { entries?: { id: string; title?: string; entry_type?: string; notes?: string; logged_at: string }[] })?.entries || (Array.isArray(entriesData) ? entriesData : []));

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center"><Heart className="w-5 h-5 text-rose-600" /></div>
          <h1 className="text-2xl font-bold text-gray-900">Family</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddDate(s => !s)} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-rose-700 transition"><Calendar className="w-4 h-4" /> Date</button>
          <button onClick={() => setShowAddEntry(s => !s)} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-rose-700 transition"><Plus className="w-4 h-4" /> Log</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Calendar className="w-5 h-5 text-rose-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{upcoming.length}</p><p className="text-xs text-gray-400">Upcoming (90d)</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Cake className="w-5 h-5 text-pink-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{allDates.filter(d => d.category === "birthday").length}</p><p className="text-xs text-gray-400">Birthdays</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Heart className="w-5 h-5 text-red-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{goals.length}</p><p className="text-xs text-gray-400">Active goals</p></div>
      </div>

      {/* Add date form */}
      {showAddDate && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Add Important Date</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Title (e.g. Mum's birthday)" value={dateForm.title} onChange={e => setDateForm(f => ({ ...f, title: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2" />
            <input type="date" value={dateForm.date} onChange={e => setDateForm(f => ({ ...f, date: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <select value={dateForm.category} onChange={e => setDateForm(f => ({ ...f, category: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 col-span-2">
              <input type="checkbox" checked={dateForm.recurring} onChange={e => setDateForm(f => ({ ...f, recurring: e.target.checked }))} className="rounded" />
              Repeats annually
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createDate.mutate()} disabled={!dateForm.title || !dateForm.date || createDate.isPending} className="px-4 py-2 bg-rose-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-rose-700 transition">{createDate.isPending ? "Saving…" : "Save"}</button>
            <button onClick={() => setShowAddDate(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Add entry form */}
      {showAddEntry && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Log Family Entry</h2>
          <div className="grid grid-cols-2 gap-3">
            <select value={entryForm.entry_type} onChange={e => setEntryForm(f => ({ ...f, entry_type: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {["event","memory","milestone","concern","gratitude","other"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <input placeholder="Title" value={entryForm.title} onChange={e => setEntryForm(f => ({ ...f, title: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <textarea placeholder="Notes" value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2 resize-none" rows={2} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addEntry.mutate()} disabled={addEntry.isPending} className="px-4 py-2 bg-rose-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-rose-700 transition">{addEntry.isPending ? "Saving…" : "Save"}</button>
            <button onClick={() => setShowAddEntry(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Upcoming dates */}
      <div className="bg-white rounded-2xl shadow-card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Upcoming (next 90 days)</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {upcoming.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No upcoming dates.</p>
          : upcoming.map(d => {
            const Icon = CAT_ICON[d.category] || Calendar;
            return (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                <Icon className={`w-4 h-4 flex-shrink-0 ${CAT_COLOR[d.category]}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{d.title}</p>
                  <p className="text-xs text-gray-400 capitalize">{d.category} · {d.next_occurrence}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(d.days_until ?? 99) <= 7 ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-500"}`}>
                  {d.days_until === 0 ? "Today!" : `${d.days_until}d`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* All dates */}
      {allDates.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">All Family Dates</h2>
          <div className="space-y-1">
            {allDates.map(d => {
              const Icon = CAT_ICON[d.category] || Calendar;
              return (
                <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${CAT_COLOR[d.category]}`} />
                  <div className="flex-1">
                    <span className="text-sm text-gray-800">{d.title}</span>
                    <span className="text-xs text-gray-400 ml-2">{d.date}{d.recurring ? " · annual" : ""}</span>
                  </div>
                  <button onClick={() => deleteDate.mutate(d.id)} className="text-gray-300 hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Goals */}
      {goals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Family Goals</h2>
          <div className="space-y-3">
            {goals.map(g => {
              const pct = g.target_value ? Math.min(100, ((g.current_value || 0) / g.target_value) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="flex justify-between mb-1"><span className="text-sm text-gray-700">{g.title}</span><span className="text-xs text-gray-400">{g.target_date || `${Math.round(pct)}%`}</span></div>
                  {g.target_value != null && <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-2 bg-rose-400 rounded-full" style={{ width: `${pct}%` }} /></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent entries */}
      {entries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Family Log</h2>
          <div className="space-y-2">
            {entries.map((e: { id?: string; title?: string; entry_type?: string; notes?: string; logged_at: string }, i: number) => (
              <div key={e.id || i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-300 flex-shrink-0 mt-2" />
                <div><p className="text-sm text-gray-800">{e.title || e.entry_type}</p>{e.notes && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{e.notes}</p>}<p className="text-xs text-gray-300 mt-0.5">{new Date(e.logged_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
