"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi, entriesApi } from "@/lib/api";
import { Globe, Plus, Users, Heart, Clock, Circle } from "lucide-react";

type Goal = { id: string; title: string; status: string; current_value?: number; target_value?: number; unit?: string; target_date?: string };
type Entry = { id: string; title?: string; entry_type?: string; notes?: string; logged_at: string; value?: number; unit?: string };

const ENTRY_TYPES = ["volunteering","donation","event","cause","networking","advocacy","other"];
const TYPE_COLOR: Record<string, string> = { volunteering: "text-green-500", donation: "text-rose-500", event: "text-blue-500", cause: "text-purple-500", networking: "text-amber-500", advocacy: "text-orange-500", other: "text-gray-400" };

export default function CommunityPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", entry_type: "volunteering", notes: "", value: "", unit: "hours" });

  const { data: goalsData = [] } = useQuery({ queryKey: ["goals", "community"], queryFn: () => goalsApi.list({ domain: "community" }).then(r => Array.isArray(r.data) ? r.data : []), staleTime: 120_000 });
  const { data: entriesData } = useQuery({ queryKey: ["entries", "community"], queryFn: () => entriesApi.list({ domain: "community", limit: 20 }).then(r => r.data), staleTime: 60_000 });

  const addEntry = useMutation({
    mutationFn: () => entriesApi.create({ ...form, domain: "community", value: form.value ? parseFloat(form.value) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["entries", "community"] }); setShowAdd(false); setForm({ title: "", entry_type: "volunteering", notes: "", value: "", unit: "hours" }); },
  });

  const goals = (goalsData as Goal[]).filter(g => g.status === "active");
  const entries = ((entriesData as { entries?: Entry[] })?.entries || (Array.isArray(entriesData) ? entriesData : [])) as Entry[];
  const volunteerHours = entries.filter(e => e.entry_type === "volunteering").reduce((sum, e) => sum + (e.value || 0), 0);
  const events = entries.filter(e => e.entry_type === "event");
  const causes = entries.filter(e => e.entry_type === "cause" || e.entry_type === "advocacy");

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-100 flex items-center justify-center"><Globe className="w-5 h-5 text-teal-600" /></div>
          <h1 className="text-2xl font-bold text-gray-900">Community</h1>
        </div>
        <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 transition"><Plus className="w-4 h-4" /> Log</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Clock className="w-4 h-4 text-green-500 mx-auto mb-1" /><p className="text-lg font-bold text-gray-900">{volunteerHours.toFixed(0)}</p><p className="text-xs text-gray-400">Volunteer hrs</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Users className="w-4 h-4 text-blue-500 mx-auto mb-1" /><p className="text-lg font-bold text-gray-900">{events.length}</p><p className="text-xs text-gray-400">Events</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Heart className="w-4 h-4 text-rose-500 mx-auto mb-1" /><p className="text-lg font-bold text-gray-900">{causes.length}</p><p className="text-xs text-gray-400">Causes</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Globe className="w-4 h-4 text-teal-500 mx-auto mb-1" /><p className="text-lg font-bold text-gray-900">{goals.length}</p><p className="text-xs text-gray-400">Active goals</p></div>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Log Community Activity</h2>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.entry_type} onChange={e => setForm(f => ({ ...f, entry_type: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {ENTRY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <input placeholder="Title / organisation" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            {form.entry_type === "volunteering" && (
              <div className="flex gap-2 col-span-2">
                <input type="number" placeholder="Hours" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-24" />
                <span className="text-sm text-gray-400 self-center">hours</span>
              </div>
            )}
            <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2 resize-none" rows={2} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addEntry.mutate()} disabled={addEntry.isPending} className="px-4 py-2 bg-teal-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-teal-700 transition">{addEntry.isPending ? "Saving…" : "Save"}</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {goals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Community Goals</h2>
          <div className="space-y-3">
            {goals.map(g => {
              const pct = g.target_value ? Math.min(100, ((g.current_value || 0) / g.target_value) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="flex justify-between mb-1"><span className="text-sm font-medium text-gray-800">{g.title}</span><span className="text-xs text-gray-400">{g.target_date || (g.target_value != null ? `${g.current_value ?? 0}/${g.target_value} ${g.unit || ""}` : "")}</span></div>
                  {g.target_value != null && <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-2 bg-teal-400 rounded-full" style={{ width: `${pct}%` }} /></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Activity Log</h2>
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={e.id || i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <Circle className={`w-3 h-3 flex-shrink-0 mt-1 ${TYPE_COLOR[e.entry_type || "other"]}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-800">{e.title || e.entry_type}</p>
                    <span className="text-xs capitalize text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{e.entry_type}</span>
                    {e.value != null && e.entry_type === "volunteering" && <span className="text-xs text-green-600">{e.value}h</span>}
                  </div>
                  {e.notes && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{e.notes}</p>}
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
