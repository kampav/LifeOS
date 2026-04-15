"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi, entriesApi } from "@/lib/api";
import { GraduationCap, Plus, BookOpen, CheckCircle2, Clock, Circle } from "lucide-react";

type Goal = { id: string; title: string; status: string; current_value?: number; target_value?: number; target_date?: string; unit?: string };
type Entry = { id: string; title?: string; entry_type?: string; notes?: string; logged_at: string; value?: number; unit?: string };

const ENTRY_TYPES = ["book","course","lecture","article","skill","exam","certificate","other"];
const TYPE_ICON: Record<string, typeof BookOpen> = { book: BookOpen, course: GraduationCap, certificate: CheckCircle2 };
const TYPE_COLOR: Record<string, string> = { book: "text-indigo-500", course: "text-purple-500", certificate: "text-green-500", lecture: "text-blue-500", article: "text-cyan-500", skill: "text-amber-500", exam: "text-orange-500", other: "text-gray-400" };

export default function EducationPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", entry_type: "book", notes: "", value: "" });

  const { data: goalsData = [] } = useQuery({ queryKey: ["goals", "education"], queryFn: () => goalsApi.list({ domain: "education" }).then(r => Array.isArray(r.data) ? r.data : []), staleTime: 120_000 });
  const { data: entriesData } = useQuery({ queryKey: ["entries", "education"], queryFn: () => entriesApi.list({ domain: "education", limit: 20 }).then(r => r.data), staleTime: 60_000 });

  const addEntry = useMutation({
    mutationFn: () => entriesApi.create({ ...form, domain: "education", value: form.value ? parseFloat(form.value) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["entries", "education"] }); setShowAdd(false); setForm({ title: "", entry_type: "book", notes: "", value: "" }); },
  });

  const goals = (goalsData as Goal[]).filter(g => g.status === "active");
  const entries = ((entriesData as { entries?: Entry[] })?.entries || (Array.isArray(entriesData) ? entriesData : [])) as Entry[];
  const books = entries.filter(e => e.entry_type === "book");
  const courses = entries.filter(e => e.entry_type === "course");
  const certs = entries.filter(e => e.entry_type === "certificate");

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-indigo-600" /></div>
          <h1 className="text-2xl font-bold text-gray-900">Education</h1>
        </div>
        <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"><Plus className="w-4 h-4" /> Log</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><BookOpen className="w-4 h-4 text-indigo-500 mx-auto mb-1" /><p className="text-lg font-bold text-gray-900">{books.length}</p><p className="text-xs text-gray-400">Books</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><GraduationCap className="w-4 h-4 text-purple-500 mx-auto mb-1" /><p className="text-lg font-bold text-gray-900">{courses.length}</p><p className="text-xs text-gray-400">Courses</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" /><p className="text-lg font-bold text-gray-900">{certs.length}</p><p className="text-xs text-gray-400">Certificates</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" /><p className="text-lg font-bold text-gray-900">{goals.length}</p><p className="text-xs text-gray-400">Active goals</p></div>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Log Learning</h2>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.entry_type} onChange={e => setForm(f => ({ ...f, entry_type: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {ENTRY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <input placeholder="Title / name" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <textarea placeholder="Notes, takeaways…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2 resize-none" rows={2} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addEntry.mutate()} disabled={addEntry.isPending} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-indigo-700 transition">{addEntry.isPending ? "Saving…" : "Save"}</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {goals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Learning Goals</h2>
          <div className="space-y-3">
            {goals.map(g => {
              const pct = g.target_value ? Math.min(100, ((g.current_value || 0) / g.target_value) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="flex justify-between mb-1"><span className="text-sm font-medium text-gray-800">{g.title}</span><span className="text-xs text-gray-400">{g.target_date || `${Math.round(pct)}%`}</span></div>
                  {g.target_value != null && <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-2 bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} /></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Learning Log</h2>
          <div className="space-y-2">
            {entries.map((e, i) => {
              const Icon = TYPE_ICON[e.entry_type || "other"] || Circle;
              return (
                <div key={e.id || i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${TYPE_COLOR[e.entry_type || "other"]}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-800">{e.title || e.entry_type}</p>
                      <span className="text-xs capitalize text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{e.entry_type}</span>
                    </div>
                    {e.notes && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{e.notes}</p>}
                    <p className="text-xs text-gray-300 mt-0.5">{new Date(e.logged_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
