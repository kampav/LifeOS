"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, AlertTriangle, CheckCircle, Clock, Calendar, Pill } from "lucide-react";

type Appointment = { id: string; title: string; appointment_type: string; scheduled_at: string; provider_name?: string; status: string };
type Medication = { id: string; name: string; dosage?: string; frequency: string; times_of_day: string[]; is_active: boolean };
type Screening = { type: string; name: string; frequency_months: number | null; min_age: number; nhs: boolean; last_done_date?: string; next_due_date?: string };

export default function HealthPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"appointments" | "medications" | "screenings" | "vaccinations">("appointments");
  const [showAdd, setShowAdd] = useState(false);
  const [apptForm, setApptForm] = useState({ title: "", appointment_type: "gp", scheduled_at: "", provider_name: "" });
  const [medForm, setMedForm] = useState({ name: "", dosage: "", frequency: "daily", times_of_day: ["morning"] });

  const { data: appts, refetch: refetchAppts } = useQuery({
    queryKey: ["health-appointments"],
    queryFn: () => api.get("/health/appointments?upcoming_only=true").then(r => r.data),
    staleTime: 60_000,
  });
  const { data: meds } = useQuery({
    queryKey: ["health-medications"],
    queryFn: () => api.get("/health/medications").then(r => r.data),
    staleTime: 60_000,
  });
  const { data: screenings } = useQuery({
    queryKey: ["health-screenings"],
    queryFn: () => api.get("/health/screenings").then(r => r.data),
    staleTime: 3_600_000,
  });
  const { data: vaccinations } = useQuery({
    queryKey: ["health-vaccinations"],
    queryFn: () => api.get("/health/vaccinations").then(r => r.data),
    staleTime: 3_600_000,
  });

  const addAppt = useMutation({
    mutationFn: () => api.post("/health/appointments", { ...apptForm, scheduled_at: new Date(apptForm.scheduled_at).toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["health-appointments"] }); setShowAdd(false); },
  });

  const addMed = useMutation({
    mutationFn: () => api.post("/health/medications", medForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["health-medications"] }); setShowAdd(false); },
  });

  const logTaken = useMutation({
    mutationFn: (id: string) => api.post(`/health/medications/${id}/taken`, { was_taken: true }),
  });

  const appointments = (appts?.appointments as Appointment[]) || [];
  const medications = (meds?.medications as Medication[]) || [];
  const nhsSchedule = (screenings?.nhs_schedule as Screening[]) || [];
  const vaccinationList = (vaccinations?.vaccinations as { vaccine_name: string; date_given: string; next_due_date?: string }[]) || [];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Health</h1>
        <button onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Add forms */}
      {showAdd && tab === "appointments" && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">New Appointment</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Title" value={apptForm.title} onChange={e => setApptForm(f => ({ ...f, title: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2" />
            <select value={apptForm.appointment_type} onChange={e => setApptForm(f => ({ ...f, appointment_type: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {["gp","specialist","dental","optical","therapy","physio","other"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="datetime-local" value={apptForm.scheduled_at} onChange={e => setApptForm(f => ({ ...f, scheduled_at: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <input placeholder="Provider name (optional)" value={apptForm.provider_name} onChange={e => setApptForm(f => ({ ...f, provider_name: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => addAppt.mutate()} disabled={!apptForm.title || !apptForm.scheduled_at || addAppt.isPending}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-indigo-700 transition">
              {addAppt.isPending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {showAdd && tab === "medications" && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">New Medication</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Medication name" value={medForm.name} onChange={e => setMedForm(f => ({ ...f, name: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2" />
            <input placeholder="Dosage (e.g. 10mg)" value={medForm.dosage} onChange={e => setMedForm(f => ({ ...f, dosage: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <select value={medForm.frequency} onChange={e => setMedForm(f => ({ ...f, frequency: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {["daily","twice_daily","weekly","monthly","as_needed"].map(f => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => addMed.mutate()} disabled={!medForm.name || addMed.isPending}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-indigo-700 transition">
              {addMed.isPending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-card">
        <div className="flex border-b border-gray-100 px-4">
          {(["appointments","medications","screenings","vaccinations"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-semibold tracking-wide capitalize transition border-b-2 -mb-px ${tab === t ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "appointments" && (
            appointments.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No upcoming appointments.</p>
              : <div className="space-y-3">
                  {appointments.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                      <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{a.title}</p>
                        <p className="text-xs text-gray-500">{new Date(a.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{a.provider_name ? ` — ${a.provider_name}` : ""}</p>
                      </div>
                      <span className="text-xs capitalize text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{a.appointment_type}</span>
                    </div>
                  ))}
                </div>
          )}

          {tab === "medications" && (
            medications.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No active medications.</p>
              : <div className="space-y-3">
                  {medications.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                      <Pill className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{m.name}{m.dosage ? ` — ${m.dosage}` : ""}</p>
                        <p className="text-xs text-gray-500">{m.frequency.replace(/_/g, " ")} · {m.times_of_day.join(", ")}</p>
                      </div>
                      <button onClick={() => logTaken.mutate(m.id)}
                        className="flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 px-2 py-1 rounded-lg transition">
                        <CheckCircle className="w-3.5 h-3.5" /> Taken
                      </button>
                    </div>
                  ))}
                </div>
          )}

          {tab === "screenings" && (
            <div className="space-y-2">
              {nhsSchedule.map(s => (
                <div key={s.type} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.next_due_date && new Date(s.next_due_date) < new Date() ? "bg-red-400" : s.next_due_date ? "bg-green-400" : "bg-gray-300"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">
                      {s.last_done_date ? `Last: ${s.last_done_date}` : "Not recorded"}
                      {s.next_due_date ? ` · Due: ${s.next_due_date}` : ""}
                      {s.frequency_months ? ` · Every ${s.frequency_months}m` : ""}
                    </p>
                  </div>
                  {s.nhs && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">NHS</span>}
                </div>
              ))}
            </div>
          )}

          {tab === "vaccinations" && (
            vaccinationList.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No vaccination records.</p>
              : <div className="space-y-2">
                  {vaccinationList.map((v, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                      <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{v.vaccine_name}</p>
                        <p className="text-xs text-gray-500">Given: {v.date_given}{v.next_due_date ? ` · Next due: ${v.next_due_date}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-800">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>Life OS provides general health information only. This is not medical advice. Always consult a qualified healthcare professional or your GP for medical concerns, diagnoses, or treatment decisions.</p>
      </div>
    </div>
  );
}
