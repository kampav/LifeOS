"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DOMAINS } from "@/lib/utils";
import { Save, User, Bell, Shield, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

const TIERS = { free: "Free", pro: "Pro", family: "Family", coach: "Coach" };

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"profile" | "priorities" | "notifications" | "subscription">("profile");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get("/profile").then(r => r.data),
  });

  const [form, setForm] = useState({ full_name: "", timezone: "Europe/London" });
  const [priorities, setPriorities] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  // Sync form when profile loads
  const profileLoaded = !!profile;
  if (profileLoaded && !form.full_name && profile.full_name) {
    setForm({ full_name: profile.full_name, timezone: profile.timezone || "Europe/London" });
    setPriorities(profile.declared_priorities || []);
  }

  const updateProfile = useMutation({
    mutationFn: (data: object) => api.put("/profile", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const togglePriority = (id: string) => {
    setPriorities(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "priorities", label: "Priorities", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "subscription", label: "Plan", icon: CreditCard },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>

        {tab === "profile" && (
          <div className="bg-white rounded-2xl p-6 shadow-card space-y-4">
            <h2 className="font-semibold text-gray-900">Profile</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Display name</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Your name" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Timezone</label>
              <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white">
                {["Europe/London", "America/New_York", "America/Los_Angeles", "America/Chicago", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney", "Europe/Paris", "Europe/Berlin"].map(tz => (
                  <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5">{profile?.email || "—"}</p>
            </div>
            <button onClick={() => updateProfile.mutate(form)}
              disabled={updateProfile.isPending}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 hover:bg-primary/90 transition-colors">
              <Save className="w-4 h-4" />
              {saved ? "Saved!" : updateProfile.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}

        {tab === "priorities" && (
          <div className="bg-white rounded-2xl p-6 shadow-card">
            <h2 className="font-semibold text-gray-900 mb-1">Life Priorities</h2>
            <p className="text-sm text-gray-500 mb-4">Select up to 3 domains. These get a 1.5× weight boost in your Life Score.</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {DOMAINS.map(d => {
                const active = priorities.includes(d.id);
                return (
                  <button key={d.id} onClick={() => togglePriority(d.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${active ? "border-primary bg-primary/5" : "border-gray-100 hover:border-gray-200"}`}>
                    <span className="text-xl">{d.icon}</span>
                    <span className={`text-sm font-medium ${active ? "text-primary" : "text-gray-700"}`}>{d.label}</span>
                    {active && <span className="ml-auto text-xs bg-primary text-white rounded-full px-1.5 py-0.5">×1.5</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => updateProfile.mutate({ declared_priorities: priorities })}
              disabled={updateProfile.isPending}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
              <Save className="w-4 h-4" />
              {saved ? "Saved!" : "Save priorities"}
            </button>
          </div>
        )}

        {tab === "notifications" && (
          <div className="bg-white rounded-2xl p-6 shadow-card space-y-4">
            <h2 className="font-semibold text-gray-900 mb-2">Notifications</h2>
            {[
              { label: "Daily brief (7am)", key: "daily_brief", desc: "Morning AI summary of your life" },
              { label: "Weekly review (Sundays)", key: "weekly_review", desc: "Deep dive across all 10 domains" },
              { label: "Goal reminders", key: "goal_reminders", desc: "Nudges for upcoming milestones" },
              { label: "Relationship check-ins", key: "relationship_checks", desc: "Prompts to reach out to people" },
              { label: "Coach insights", key: "coach_insights", desc: "AI-spotted patterns and suggestions" },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{n.label}</p>
                  <p className="text-xs text-gray-400">{n.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            ))}
          </div>
        )}

        {tab === "subscription" && (
          <div className="bg-white rounded-2xl p-6 shadow-card">
            <h2 className="font-semibold text-gray-900 mb-4">Your Plan</h2>
            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{TIERS[(profile?.subscription_tier as keyof typeof TIERS) || "free"]} Plan</p>
                <p className="text-xs text-gray-500">{profile?.subscription_tier === "free" ? "100 AI calls/month" : "Unlimited AI calls"}</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { tier: "free", price: "Free", features: ["100 AI calls/month", "7 domains", "Basic reviews"] },
                { tier: "pro", price: "£9.99/mo", features: ["Unlimited AI calls", "All 10 domains", "Weekly AI reviews", "Priority support"] },
                { tier: "family", price: "£19.99/mo", features: ["Everything in Pro", "Up to 5 members", "Family insights"] },
              ].map(p => (
                <div key={p.tier} className={`p-4 rounded-xl border-2 ${profile?.subscription_tier === p.tier ? "border-primary bg-primary/5" : "border-gray-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 capitalize">{p.tier}</span>
                    <span className="font-bold text-primary">{p.price}</span>
                  </div>
                  <ul className="space-y-1">
                    {p.features.map(f => <li key={f} className="text-xs text-gray-500 flex items-center gap-1.5"><span className="w-1 h-1 bg-primary rounded-full" />{f}</li>)}
                  </ul>
                  {profile?.subscription_tier !== p.tier && p.tier !== "free" && (
                    <button className="mt-3 w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                      Upgrade to {p.tier}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
