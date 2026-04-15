"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { socialApi } from "@/lib/api";
import { Users, Plus, MessageCircle, AlertCircle, Check } from "lucide-react";

type Contact = { id: string; name: string; relationship?: string; desired_frequency?: string; last_contact_date?: string; notes?: string };

const RELATIONSHIPS = ["friend","family","colleague","mentor","partner","acquaintance","other"];
const FREQUENCIES = ["weekly","monthly","quarterly","yearly"];
const FREQ_DAYS: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90, yearly: 365 };

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function dueLabel(contact: Contact): { overdue: boolean; label: string } | null {
  if (!contact.desired_frequency) return null;
  const days = daysSince(contact.last_contact_date);
  const threshold = FREQ_DAYS[contact.desired_frequency] ?? 30;
  if (days === null) return { overdue: true, label: "Never contacted" };
  if (days >= threshold) return { overdue: true, label: `${days}d ago — due` };
  return { overdue: false, label: `${days}d ago` };
}

export default function SocialPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [logNotes, setLogNotes] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", relationship: "friend", desired_frequency: "monthly", notes: "" });

  const { data: contacts = [] } = useQuery({
    queryKey: ["social-contacts", filter],
    queryFn: () => socialApi.contacts(filter !== "all" ? { relationship: filter } : {}).then(r => Array.isArray(r.data) ? r.data : []),
    staleTime: 60_000,
  });
  const { data: dueContacts = [] } = useQuery({
    queryKey: ["social-due"],
    queryFn: () => socialApi.dueCheckins().then(r => Array.isArray(r.data) ? r.data : []),
    staleTime: 60_000,
  });

  const createContact = useMutation({
    mutationFn: () => socialApi.createContact(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["social-contacts"] }); setShowAdd(false); setForm({ name: "", relationship: "friend", desired_frequency: "monthly", notes: "" }); },
  });

  const logInteraction = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => socialApi.logInteraction(id, notes || undefined),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["social-contacts"] });
      qc.invalidateQueries({ queryKey: ["social-due"] });
      setLogNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
    },
  });

  const allContacts = contacts as Contact[];
  const due = dueContacts as Contact[];
  const overdue = allContacts.filter(c => dueLabel(c)?.overdue);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center"><Users className="w-5 h-5 text-pink-600" /></div>
          <h1 className="text-2xl font-bold text-gray-900">Social</h1>
        </div>
        <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-pink-700 transition">
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><Users className="w-5 h-5 text-pink-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{allContacts.length}</p><p className="text-xs text-gray-400">Contacts</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{due.length}</p><p className="text-xs text-gray-400">Due check-ins</p></div>
        <div className="bg-white rounded-2xl p-4 shadow-card text-center"><MessageCircle className="w-5 h-5 text-green-500 mx-auto mb-1" /><p className="text-xl font-bold text-gray-900">{allContacts.length - overdue.length}</p><p className="text-xs text-gray-400">Up to date</p></div>
      </div>

      {/* Add contact form */}
      {showAdd && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">New Contact</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2" />
            <select value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {RELATIONSHIPS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <select value={form.desired_frequency} onChange={e => setForm(f => ({ ...f, desired_frequency: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
            <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => createContact.mutate()} disabled={!form.name || createContact.isPending} className="px-4 py-2 bg-pink-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-pink-700 transition">{createContact.isPending ? "Saving…" : "Save"}</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Due check-ins */}
      {due.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-900">Due Check-ins ({due.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(due as Contact[]).map(c => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-sm font-bold flex-shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{c.relationship} · {c.desired_frequency}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Quick note…"
                    value={logNotes[c.id] || ""}
                    onChange={e => setLogNotes(prev => ({ ...prev, [c.id]: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-28 hidden sm:block"
                  />
                  <button
                    onClick={() => logInteraction.mutate({ id: c.id, notes: logNotes[c.id] || "" })}
                    disabled={logInteraction.isPending}
                    className="flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 px-2 py-1 rounded-lg transition">
                    <Check className="w-3.5 h-3.5" /> Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All contacts */}
      <div className="bg-white rounded-2xl shadow-card">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">All Contacts</h2>
            <div className="flex gap-1">
              {["all", ...RELATIONSHIPS.slice(0, 4)].map(r => (
                <button key={r} onClick={() => setFilter(r)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition ${filter === r ? "bg-pink-600 text-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
                  {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {allContacts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No contacts yet. Add your first one above.</p>
          ) : allContacts.map(c => {
            const due = dueLabel(c);
            return (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-bold flex-shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{c.relationship}{c.desired_frequency ? ` · ${c.desired_frequency}` : ""}</p>
                </div>
                {due && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${due.overdue ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                    {due.label}
                  </span>
                )}
                <button
                  onClick={() => logInteraction.mutate({ id: c.id, notes: "" })}
                  className="flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 px-2 py-1 rounded-lg transition">
                  <MessageCircle className="w-3.5 h-3.5" /> Log
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
