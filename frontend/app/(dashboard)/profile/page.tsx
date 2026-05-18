"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, notificationsApi } from "@/lib/api";
import { User, Bell, Shield, Sparkles } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => usersApi.me().then(r => r.data) });
  const { data: prefs } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => notificationsApi.getPreferences().then(r => r.data),
    retry: false,
  });
  const [form, setForm] = useState({ full_name: "", timezone: "" });

  const updateProfile = useMutation({
    mutationFn: () => usersApi.update({
      full_name: form.full_name || profile?.full_name || profile?.name,
      timezone: form.timezone || profile?.timezone,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });

  const updatePrefs = useMutation({
    mutationFn: (payload: Record<string, unknown>) => notificationsApi.updatePreferences(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-preferences"] }),
  });

  const generateNudges = useMutation({
    mutationFn: () => notificationsApi.generateNudges().then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const displayName = profile?.full_name || profile?.name || "Your profile";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <section className="panel-dark rounded-[2rem] p-6 text-white md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">Profile</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">{displayName}</h1>
            <p className="mt-2 text-sm text-white/70">{profile?.email || "Manage how LifeOS knows you."}</p>
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-[1.75rem] bg-white/15">
            <User className="h-9 w-9" />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <section className="panel rounded-[1.5rem] p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-black text-slate-950">Personal details</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-600">
              Name
              <input
                value={form.full_name || profile?.full_name || profile?.name || ""}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 text-sm outline-none ring-primary/20 focus:ring-4"
              />
            </label>
            <label className="text-sm font-bold text-slate-600">
              Timezone
              <input
                value={form.timezone || profile?.timezone || ""}
                onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                placeholder="Europe/London"
                className="mt-2 h-12 w-full rounded-2xl border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 text-sm outline-none ring-primary/20 focus:ring-4"
              />
            </label>
          </div>
          <button
            onClick={() => updateProfile.mutate()}
            className="mt-5 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 disabled:opacity-50"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? "Saving..." : "Save profile"}
          </button>
        </section>

        <section className="panel rounded-[1.5rem] p-5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-black text-slate-950">Notifications and nudges</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Keep nudges useful and sparse. LifeOS should interrupt only when it helps.
          </p>
          <div className="mt-4 space-y-3">
            {[
              ["daily_brief", "Daily brief"],
              ["evening_reflection", "Evening reflection"],
              ["weekly_review", "Weekly review"],
              ["email_daily_brief", "Email daily brief"],
              ["nudges", "Smart nudges"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => updatePrefs.mutate({ ...(prefs || {}), [key]: !(prefs as Record<string, boolean> | undefined)?.[key] })}
                className="flex w-full items-center justify-between rounded-2xl border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 py-3 text-left"
              >
                <span className="text-sm font-bold text-slate-700">{label}</span>
                <span className={`h-6 w-11 rounded-full p-1 transition ${(prefs as Record<string, boolean> | undefined)?.[key] ? "bg-primary" : "bg-slate-300"}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white transition ${(prefs as Record<string, boolean> | undefined)?.[key] ? "translate-x-5" : ""}`} />
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => generateNudges.mutate()}
            disabled={generateNudges.isPending}
            className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {generateNudges.isPending ? "Finding useful nudges..." : "Generate useful nudges now"}
          </button>
          {generateNudges.data && (
            <p className="mt-2 text-xs font-bold text-primary">
              {generateNudges.data.created} nudge{generateNudges.data.created === 1 ? "" : "s"} added.
            </p>
          )}
          <div className="mt-4 flex gap-2 rounded-2xl bg-primary/10 p-3 text-sm leading-6 text-slate-700">
            <Shield className="mt-0.5 h-4 w-4 flex-none text-primary" />
            Profile, consent and data controls remain separate in Privacy settings.
          </div>
        </section>
      </div>
    </div>
  );
}
