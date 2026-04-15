"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { importantDatesApi, goalsApi, entriesApi } from "@/lib/api";
import { Plane, Plus, MapPin, Calendar, Star, Trash2 } from "lucide-react";

type ImportantDate = { id: string; title: string; date: string; category: string; next_occurrence?: string; days_until?: number; notes?: string };
type Entry = { id: string; title?: string; entry_type?: string; notes?: string; logged_at: string };
type Goal = { id: string; title: string; status: string; current_value?: number; target_value?: number; target_date?: string };

const TRIP_ENTRY_TYPES = ["trip","bucket_list","memory","planning","visa","other"];

export default function HolidayPage() {
  const qc = useQueryClient();
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [tripForm, setTripForm] = useState({ title: "", date: "", notes: "" });
  const [entryForm, setEntryForm] = useState({ title: "", entry_type: "trip", notes: "" });

  const { data: upcomingData } = useQuery({ queryKey: ["important-dates-upcoming", "holiday"], queryFn: () => importantDatesApi.upcoming(365, "holiday").then(r => r.data), staleTime: 120_000 });
  const { data: allDatesData } = useQuery({ queryKey: ["important-dates", "holiday"], queryFn: () => importantDatesApi.list({ domain: "holiday" }).then(r => r.data), staleTime: 120_000 });
  const { data: goalsData = [] } = useQuery({ queryKey: ["goals", "holiday"], queryFn: () => goalsApi.list({ domain: "holiday" }).then(r => Array.isArray(r.data) ? r.data : []), staleTime: 120_000 });
  const { data: entriesData } = useQuery({ queryKey: ["entries", "holiday"], queryFn: () => entriesApi.list({ domain: "holiday", limit: 12 }).then(r => r.data), staleTime: 60_000 });

  const addTrip = useMutation({
    mutationFn: () => importantDatesApi.create({ title: tripForm.title, date: tripForm.date, category: "holiday", domain: "holiday", recurring: false, notes: tripForm.notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["important-dates"] }); setShowAddTrip(false); setTripForm({ title: "", date: "", notes: "" }); },
  });
  const deleteTrip = useMutation({ mutationFn: (id: string) => importantDatesApi.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["important-dates"] }) });
  const addEntry = useMutation({
    mutationFn: () => entriesApi.create({ ...entryForm, domain: "holiday" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["entries", "holiday"] }); setShowAddEntry(false); setEntryForm({ title: "", entry_type: "trip", notes: "" }); },
  });

  const upcoming = (upcomingData?.upcoming as ImportantDate[]) || [];
  const allDates = (allDatesData?.dates as ImportantDate[]) || [];
  const goals = (goalsData as Goal[]).filter(g => g.status === "active");
  const entries = ((entriesData as { entries?: Entry[] })?.entries || (Array.isArray(entriesData) ? entriesData : [])) as Entry[];
  const memories = entries.filter(e => e.entry_type === "memory" || e.entry_type === "trip");
  const bucketList = entries.filter(e => e.entry_type === "bucket_list");

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center"><Plane className="w-5 h-5 text-sky-600" /></div>
          <h1 className="text-2xl font-bold text-gray-900">Holiday & Travel</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddTrip(s => !s)} className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-700 transition"><Calendar className="w-4 h-4" /> Trip</button>
          <button onClick={() => setShowAddEntry(s => !s)} className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-sky-700 transition"><Plus className="w-4 h-4" /> Log</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Plane className="w-5 h-5 text-sky-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{upcoming.length}</p><p className="text-xs text-gray-400">Upcoming trips</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Star className="w-5 h-5 text-amber-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{bucketList.length}</p><p className="text-xs text-gray-400">Bucket list</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><MapPin className="w-5 h-5 text-rose-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{memories.length}</p><p className="text-xs text-gray-400">Memories</p></div>
      </div>

      {showAddTrip && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Plan a Trip</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Destination / trip name" value={tripForm.title} onChange={e => setTripForm(f => ({ ...f, title: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2" />
            <input type="date" value={tripForm.date} onChange={e => setTripForm(f => ({ ...f, date: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <input placeholder="Notes (optional)" value={tripForm.notes} onChange={e => setTripForm(f => ({ ...f, notes: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addTrip.mutate()} disabled={!tripForm.title || !tripForm.date || addTrip.isPending} className="px-4 py-2 bg-sky-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-sky-700 transition">{addTrip.isPending ? "Saving…" : "Save"}</button>
            <button onClick={() => setShowAddTrip(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {showAddEntry && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Log Travel Entry</h2>
          <div className="grid grid-cols-2 gap-3">
            <select value={entryForm.entry_type} onChange={e => setEntryForm(f => ({ ...f, entry_type: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {TRIP_ENTRY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/^./, s => s.toUpperCase())}</option>)}
            </select>
            <input placeholder="Title / place" value={entryForm.title} onChange={e => setEntryForm(f => ({ ...f, title: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <textarea placeholder="Notes" value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2 resize-none" rows={2} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addEntry.mutate()} disabled={addEntry.isPending} className="px-4 py-2 bg-sky-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-sky-700 transition">{addEntry.isPending ? "Saving…" : "Save"}</button>
            <button onClick={() => setShowAddEntry(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Upcoming trips */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900 flex items-center gap-2"><Plane className="w-4 h-4 text-sky-500" /> Upcoming Trips</h2></div>
          <div className="divide-y divide-gray-50">
            {upcoming.map(d => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <div className="flex-1"><p className="text-sm font-medium text-gray-900">{d.title}</p><p className="text-xs text-gray-400">{d.next_occurrence}{d.notes ? ` · ${d.notes}` : ""}</p></div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(d.days_until ?? 99) <= 30 ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-500"}`}>{d.days_until === 0 ? "Today!" : `${d.days_until}d`}</span>
                <button onClick={() => deleteTrip.mutate(d.id)} className="text-gray-300 hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bucket list */}
      {bucketList.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Bucket List</h2>
          <div className="space-y-1">
            {bucketList.map((e, i) => (
              <div key={e.id || i} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div><p className="text-sm text-gray-800">{e.title}</p>{e.notes && <p className="text-xs text-gray-400">{e.notes}</p>}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals */}
      {goals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Travel Goals</h2>
          <div className="space-y-2">
            {goals.map(g => <div key={g.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"><span className="text-sm text-gray-800">{g.title}</span>{g.target_date && <span className="text-xs text-gray-400">{g.target_date}</span>}</div>)}
          </div>
        </div>
      )}

      {/* Travel memories */}
      {memories.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-rose-400" /> Travel Memories</h2>
          <div className="space-y-2">
            {memories.map((e, i) => (
              <div key={e.id || i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <MapPin className="w-3.5 h-3.5 text-rose-300 flex-shrink-0 mt-0.5" />
                <div><p className="text-sm text-gray-800">{e.title}</p>{e.notes && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{e.notes}</p>}<p className="text-xs text-gray-300 mt-0.5">{new Date(e.logged_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
