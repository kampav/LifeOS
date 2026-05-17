"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usersApi, privacyApi } from "@/lib/api";
import { DOMAINS } from "@/lib/utils";
import { CheckCircle, Shield } from "lucide-react";

const STEPS = ["welcome", "profile", "life-stage", "priorities", "consent", "done"] as const;

const LIFE_STAGES = [
  { id: "early_career", label: "Early career", subtitle: "Building foundations and rhythm" },
  { id: "established", label: "Established", subtitle: "Family, leadership and assets" },
  { id: "peak", label: "Peak", subtitle: "Scale, legacy and renewal" },
  { id: "transition", label: "Transition", subtitle: "A new chapter or reinvention" },
];

const REQUIRED_CONSENTS = [
  { type: "health_data", label: "Health data", desc: "Store and organise health appointments, medication and wellbeing signals." },
  { type: "financial_data", label: "Financial data", desc: "Store budgets, assets, transactions and planning context." },
  { type: "ai_processing", label: "AI coach", desc: "Use private summaries to help LifeOS recommend the next useful step." },
] as const;

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex justify-center gap-2">
      {STEPS.map((s, i) => (
        <span
          key={s}
          className={`h-2 rounded-full transition-all ${i === step ? "w-7 bg-primary" : i < step ? "w-2 bg-primary/60" : "w-2 bg-[var(--md-outline)]"}`}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: "",
    age: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    life_stage: "",
    priorities: [] as string[],
  });
  const [consents, setConsents] = useState<Record<string, boolean>>({
    health_data: false,
    financial_data: false,
    ai_processing: false,
  });
  const [saving, setSaving] = useState(false);

  const currentStep = STEPS[step];
  const allRequiredConsented = REQUIRED_CONSENTS.every(c => consents[c.type]);

  async function finish() {
    setSaving(true);
    try {
      await Promise.all(REQUIRED_CONSENTS.filter(c => consents[c.type]).map(c => privacyApi.grant(c.type)));
      await usersApi.onboarding({
        name: data.name,
        age: parseInt(data.age) || undefined,
        timezone: data.timezone,
        life_stage: data.life_stage,
        declared_priorities: data.priorities,
      });
      router.push("/");
    } catch {
      setSaving(false);
    }
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
    <main className="min-h-screen overflow-hidden bg-[var(--md-surface)] text-[var(--md-on-surface)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-6 md:px-10">
        <div className="grid overflow-hidden rounded-[2rem] border border-[var(--md-outline)] bg-[var(--md-surface-container-high)] shadow-2xl shadow-primary/10 md:min-h-[760px] md:grid-cols-[0.95fr_1.05fr]">
          <section className="vivid-gradient relative flex min-h-[340px] flex-col justify-between overflow-hidden p-7 text-white md:p-10">
            <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute -bottom-16 -left-20 h-72 w-72 rounded-full bg-[#CBBEFF]/25 blur-3xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 shadow-lg shadow-purple-950/10">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </div>
                <div>
                  <p className="text-sm font-extrabold leading-none">Life OS</p>
                  <p className="mt-1 text-xs font-semibold text-white/70">One inbox for life</p>
                </div>
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">Private beta</span>
            </div>

            <div className="relative z-10 max-w-md">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-white/60">Capture. Decide. Act.</p>
              <h1 className="serif-italic text-[48px] leading-[0.98] md:text-[64px]">
                Your life deserves a system.
              </h1>
              <p className="mt-5 max-w-sm text-base font-medium leading-7 text-white/78">
                Email, calendar, goals, tasks and second brain should collapse into one calm daily flow.
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-3 gap-2">
              {["Do", "Schedule", "Remember"].map(label => (
                <div key={label} className="rounded-2xl bg-white/16 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-white/60">Decision</p>
                  <p className="mt-1 text-sm font-extrabold">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col p-6 md:p-10">
            <StepDots step={step} />

            <div className="flex flex-1 flex-col justify-center py-8">
              {currentStep === "welcome" && (
                <div className="mx-auto max-w-md text-center">
                  <div className="mx-auto mb-8 grid h-24 w-24 place-items-center rounded-[2rem] bg-primary text-white shadow-2xl shadow-primary/25">
                    <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Set up your one-stop LifeOS</h2>
                  <p className="mt-4 text-base leading-7 text-[var(--md-on-surface-variant)]">
                    We will start simple: what matters, what season you are in, and what data LifeOS may use.
                  </p>
                  <button onClick={() => setStep(1)} className="mt-8 h-14 w-full rounded-2xl bg-primary text-sm font-extrabold text-white shadow-lg shadow-primary/25 transition hover:-translate-y-0.5">
                    Get started
                  </button>
                </div>
              )}

              {currentStep === "profile" && (
                <div className="mx-auto w-full max-w-md space-y-6">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight">What should LifeOS call you?</h2>
                    <p className="mt-2 text-[var(--md-on-surface-variant)]">This keeps the coach and daily flow personal.</p>
                  </div>
                  <div className="space-y-4">
                    <input
                      value={data.name}
                      onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                      placeholder="Pav"
                      className="h-14 w-full rounded-2xl border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 text-sm font-semibold outline-none ring-primary/20 transition focus:ring-4"
                    />
                    <input
                      value={data.age}
                      onChange={e => setData(d => ({ ...d, age: e.target.value }))}
                      type="number"
                      placeholder="Age"
                      className="h-14 w-full rounded-2xl border border-[var(--md-outline)] bg-[var(--md-surface)] px-4 text-sm font-semibold outline-none ring-primary/20 transition focus:ring-4"
                    />
                  </div>
                  <button onClick={() => setStep(2)} disabled={!data.name} className="h-14 w-full rounded-2xl bg-primary text-sm font-extrabold text-white shadow-lg shadow-primary/25 disabled:opacity-40">
                    Continue
                  </button>
                </div>
              )}

              {currentStep === "life-stage" && (
                <div className="mx-auto w-full max-w-xl space-y-6">
                  <div className="text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight">What season are you in?</h2>
                    <p className="mt-2 text-[var(--md-on-surface-variant)]">LifeOS uses this to reduce noise and surface better defaults.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {LIFE_STAGES.map(ls => (
                      <button
                        key={ls.id}
                        onClick={() => setData(d => ({ ...d, life_stage: ls.id }))}
                        className={`rounded-[1.25rem] border-2 p-5 text-left transition active:scale-[0.98] ${
                          data.life_stage === ls.id ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" : "border-[var(--md-outline)] bg-[var(--md-surface)] hover:border-primary/40"
                        }`}
                      >
                        <p className="text-base font-extrabold">{ls.label}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--md-on-surface-variant)]">{ls.subtitle}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="h-12 flex-1 rounded-2xl border border-[var(--md-outline)] text-sm font-bold">Back</button>
                    <button onClick={() => setStep(3)} disabled={!data.life_stage} className="h-12 flex-1 rounded-2xl bg-primary text-sm font-extrabold text-white disabled:opacity-40">Continue</button>
                  </div>
                </div>
              )}

              {currentStep === "priorities" && (
                <div className="mx-auto w-full max-w-xl space-y-6">
                  <div className="text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight">What matters most right now?</h2>
                    <p className="mt-2 text-[var(--md-on-surface-variant)]">Pick up to three. LifeOS will focus your dashboard here.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {DOMAINS.slice(0, 10).map(d => {
                      const selected = data.priorities.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          onClick={() => togglePriority(d.id)}
                          className={`relative rounded-[1.25rem] border-2 bg-[var(--md-surface-container-high)] p-4 text-left shadow-sm transition active:scale-[0.98] ${
                            selected ? "border-primary shadow-lg shadow-primary/10" : "border-transparent hover:border-[var(--md-outline)]"
                          }`}
                        >
                          {selected && (
                            <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-primary text-white">
                              <CheckCircle className="h-4 w-4" />
                            </span>
                          )}
                          <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: `${d.color}1A`, color: d.color }}>
                            <span className="material-symbols-outlined">{d.icon || "radio_button_unchecked"}</span>
                          </span>
                          <p className="text-lg font-extrabold">{d.label}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--md-on-surface-variant)]">
                            {selected ? `Priority ${data.priorities.indexOf(d.id) + 1}` : "Tap to focus"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)} className="h-12 flex-1 rounded-2xl border border-[var(--md-outline)] text-sm font-bold">Back</button>
                    <button onClick={() => setStep(4)} disabled={data.priorities.length === 0} className="h-12 flex-1 rounded-2xl bg-primary text-sm font-extrabold text-white disabled:opacity-40">Continue</button>
                  </div>
                </div>
              )}

              {currentStep === "consent" && (
                <div className="mx-auto w-full max-w-xl space-y-6">
                  <div className="flex gap-3">
                    <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight">Connect the system responsibly</h2>
                      <p className="mt-1 text-sm leading-6 text-[var(--md-on-surface-variant)]">You control what LifeOS can process. These are required for the current core experience.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {REQUIRED_CONSENTS.map(c => (
                      <button
                        key={c.type}
                        onClick={() => setConsents(prev => ({ ...prev, [c.type]: !prev[c.type] }))}
                        className={`flex w-full items-start gap-3 rounded-[1.25rem] border-2 p-4 text-left transition ${
                          consents[c.type] ? "border-primary bg-primary/10" : "border-[var(--md-outline)] bg-[var(--md-surface)]"
                        }`}
                      >
                        <span className={`mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-lg border-2 ${consents[c.type] ? "border-primary bg-primary text-white" : "border-[var(--md-outline)]"}`}>
                          {consents[c.type] && <CheckCircle className="h-4 w-4" />}
                        </span>
                        <span>
                          <span className="block text-sm font-extrabold">{c.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-[var(--md-on-surface-variant)]">{c.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(3)} className="h-12 flex-1 rounded-2xl border border-[var(--md-outline)] text-sm font-bold">Back</button>
                    <button onClick={() => setStep(5)} disabled={!allRequiredConsented} className="h-12 flex-1 rounded-2xl bg-primary text-sm font-extrabold text-white disabled:opacity-40">
                      {allRequiredConsented ? "Continue" : "Consent required"}
                    </button>
                  </div>
                </div>
              )}

              {currentStep === "done" && (
                <div className="mx-auto max-w-md text-center">
                  <div className="mx-auto mb-8 grid h-20 w-20 place-items-center rounded-[1.75rem] bg-emerald-100 text-emerald-600">
                    <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight">LifeOS is ready, {data.name}</h2>
                  <p className="mt-3 text-base leading-7 text-[var(--md-on-surface-variant)]">
                    Start with one inbox, one next action, and a second brain that grows quietly in the background.
                  </p>
                  <button onClick={finish} disabled={saving} className="mt-8 h-14 w-full rounded-2xl bg-primary text-sm font-extrabold text-white shadow-lg shadow-primary/25 disabled:opacity-40">
                    {saving ? "Setting up..." : "Enter LifeOS"}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
