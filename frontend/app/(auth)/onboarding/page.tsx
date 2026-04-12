"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usersApi } from "@/lib/api";
import { DOMAINS } from "@/lib/utils";

const STEPS = ["profile", "life-stage", "priorities", "first-goal", "done"] as const;

const LIFE_STAGES = [
  { id: "early_career", label: "Early Career", subtitle: "Building foundations, 20s-early 30s" },
  { id: "established", label: "Established", subtitle: "Peak earning, family building, 30s-40s" },
  { id: "peak", label: "Peak", subtitle: "Leadership, legacy, 40s-50s" },
  { id: "transition", label: "Transition", subtitle: "Reinvention or pre-retirement" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: "", age: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, life_stage: "", priorities: [] as string[] });
  const [saving, setSaving] = useState(false);

  const currentStep = STEPS[step];

  async function finish() {
    setSaving(true);
    try {
      await usersApi.onboarding({
        name: data.name,
        age: parseInt(data.age) || undefined,
        timezone: data.timezone,
        life_stage: data.life_stage,
        declared_priorities: data.priorities,
      });
      router.push("/");
    } catch { setSaving(false); }
  }

  function togglePriority(id: string) {
    setData(d => ({
      ...d,
      priorities: d.priorities.includes(id)
        ? d.priorities.filter(p => p !== id)
        : d.priorities.length < 3 ? [...d.priorities, id] : d.priorities,
    }));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-gray-200"}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-card p-8">
          {currentStep === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Welcome! Let's set up your profile</h2>
                <p className="text-gray-500 mt-1">This helps your AI coach personalise everything for you.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
                  <input value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                    placeholder="Alex" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input value={data.age} onChange={e => setData(d => ({ ...d, age: e.target.value }))}
                    type="number" placeholder="35" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <button onClick={() => setStep(s => s + 1)} disabled={!data.name}
                className="w-full bg-primary text-white rounded-xl py-3 font-medium disabled:opacity-50">Continue</button>
            </div>
          )}

          {currentStep === "life-stage" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">What stage of life are you in?</h2>
                <p className="text-gray-500 mt-1">Your coach will tailor advice to your season of life.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {LIFE_STAGES.map(ls => (
                  <button key={ls.id} onClick={() => setData(d => ({ ...d, life_stage: ls.id }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${data.life_stage === ls.id ? "border-primary bg-primary/5" : "border-gray-100 hover:border-gray-200"}`}>
                    <div className="font-semibold text-gray-900 text-sm">{ls.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{ls.subtitle}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(s => s - 1)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm">Back</button>
                <button onClick={() => setStep(s => s + 1)} disabled={!data.life_stage}
                  className="flex-1 bg-primary text-white rounded-xl py-3 font-medium disabled:opacity-50">Continue</button>
              </div>
            </div>
          )}

          {currentStep === "priorities" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Pick your top 3 priorities</h2>
                <p className="text-gray-500 mt-1">These domains get extra weight in your Life Score.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {DOMAINS.map(d => (
                  <button key={d.id} onClick={() => togglePriority(d.id)}
                    className={`p-3 rounded-xl border-2 text-left flex items-center gap-2 transition-all ${data.priorities.includes(d.id) ? "border-primary bg-primary/5" : "border-gray-100 hover:border-gray-200"}`}>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-sm font-medium text-gray-900">{d.label}</span>
                    {data.priorities.includes(d.id) && <span className="ml-auto text-primary text-xs font-bold">#{data.priorities.indexOf(d.id) + 1}</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(s => s - 1)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm">Back</button>
                <button onClick={() => setStep(s => s + 1)} disabled={data.priorities.length === 0}
                  className="flex-1 bg-primary text-white rounded-xl py-3 font-medium disabled:opacity-50">Continue</button>
              </div>
            </div>
          )}

          {currentStep === "first-goal" && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                <span className="text-3xl">🎯</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">You're all set, {data.name}!</h2>
                <p className="text-gray-500 mt-2">Your AI coach is ready. We'll start with a quick overview of your life across all 10 domains.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                {data.priorities.slice(0, 3).map(p => {
                  const domain = DOMAINS.find(d => d.id === p);
                  return domain ? (
                    <div key={p} className="bg-gray-50 rounded-lg p-2 text-center">
                      <span className="block w-4 h-4 rounded-full mx-auto mb-1" style={{ background: domain.color }} />
                      {domain.label}
                    </div>
                  ) : null;
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(s => s - 1)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm">Back</button>
                <button onClick={finish} disabled={saving}
                  className="flex-1 bg-primary text-white rounded-xl py-3 font-medium disabled:opacity-50">
                  {saving ? "Setting up…" : "Enter Life OS"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
