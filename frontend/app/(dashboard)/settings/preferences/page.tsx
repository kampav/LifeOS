"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, CheckCircle2, Lightbulb, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import { applyPersonalisation, DEFAULT_PREFS } from "@/lib/personalisation";
import type { PersonalisationPrefs } from "@/lib/personalisation";

const DOMAINS = ["health", "finance", "family", "social", "career", "growth", "property", "holiday", "community", "education"];

const TONE_OPTIONS = [
  { value: 1, label: "Formal", desc: "Professional and structured" },
  { value: 2, label: "Warm", desc: "Encouraging and supportive" },
  { value: 3, label: "Direct", desc: "Concise, no fluff" },
  { value: 4, label: "Motivational", desc: "High energy and bold" },
  { value: 5, label: "Friendly", desc: "Conversational and casual" },
];

const DETAIL_OPTIONS = [
  { value: 1, label: "Brief", desc: "Bullet points only" },
  { value: 2, label: "Summary", desc: "Key numbers + headlines" },
  { value: 3, label: "Balanced", desc: "Context + insight" },
  { value: 4, label: "Thorough", desc: "Explanations + examples" },
  { value: 5, label: "Deep", desc: "Comprehensive analysis" },
];

const ACCENT_COLOURS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444",
  "#F97316", "#EAB308", "#22C55E", "#14B8A6",
  "#06B6D4", "#3B82F6", "#6B7280", "#1F2937",
];

interface LearningInsight {
  type: string;
  severity: "info" | "positive" | "warning";
  title: string;
  message: string;
  domain?: string | null;
  action: string;
}

interface LearningResponse {
  most_engaged_domain: string;
  least_engaged_domain: string;
  suggested_tone: number;
  suggested_detail_level: number;
  suggested_domain_weights: Record<string, number>;
  confidence: "low" | "medium" | "high";
  sample_size: number;
  insights: LearningInsight[];
}

export default function PreferencesPage() {
  const qc = useQueryClient();
  const { data: prefs, isLoading } = useQuery<PersonalisationPrefs>({
    queryKey: ["personalisation"],
    queryFn: () => api.get("/users/me/personalisation").then(r => Array.isArray(r.data) ? r.data : r.data),
  });

  const { data: learning } = useQuery<LearningResponse>({
    queryKey: ["personalisation-learning"],
    queryFn: () => api.get("/users/me/personalisation/learning").then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: (updates: Partial<PersonalisationPrefs>) =>
      api.patch("/users/me/personalisation", updates).then(r => r.data),
    onSuccess: (data) => {
      qc.setQueryData(["personalisation"], data);
      applyPersonalisation(data);
    },
  });

  const reset = useMutation({
    mutationFn: () => api.post("/users/me/personalisation/reset").then(r => r.data),
    onSuccess: (data) => {
      qc.setQueryData(["personalisation"], data);
      applyPersonalisation(data);
    },
  });

  const current = prefs || DEFAULT_PREFS;

  function patch(updates: Partial<PersonalisationPrefs>) {
    mutation.mutate(updates);
  }

  function applyLearningSuggestions() {
    if (!learning) return;
    patch({
      domain_weights: learning.suggested_domain_weights,
      coach_tone: learning.suggested_tone,
      detail_level: learning.suggested_detail_level,
    });
  }

  if (isLoading) return <div className="p-6 text-sm text-gray-500">Loading preferences…</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Coach Preferences</h1>
        <button
          onClick={() => reset.mutate()}
          className="text-xs text-gray-500 hover:text-red-500 transition"
        >
          Reset to defaults
        </button>
      </div>

      {learning && (
        <section className="border border-slate-200 bg-slate-950 text-white rounded-xl overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-cyan-200">
                  <Activity className="h-4 w-4" />
                  Adaptive learning
                </div>
                <h2 className="mt-2 text-lg font-semibold">Life OS is learning your operating rhythm</h2>
                <p className="mt-1 text-sm text-slate-300">
                  {learning.sample_size} behavioural signals analysed. Confidence: {learning.confidence}.
                </p>
              </div>
              <button
                onClick={applyLearningSuggestions}
                disabled={mutation.isPending || learning.confidence === "low"}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Apply suggestions
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Strongest signal</div>
                <div className="mt-1 text-sm font-semibold capitalize">{learning.most_engaged_domain}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Quietest domain</div>
                <div className="mt-1 text-sm font-semibold capitalize">{learning.least_engaged_domain}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Suggested style</div>
                <div className="mt-1 text-sm font-semibold">
                  Tone {learning.suggested_tone} / Detail {learning.suggested_detail_level}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {learning.insights.slice(0, 3).map((insight, index) => (
                <div key={`${insight.type}-${index}`} className="flex gap-3 rounded-lg bg-white/5 p-3">
                  {insight.severity === "positive" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-300" />
                  ) : (
                    <Lightbulb className="mt-0.5 h-4 w-4 flex-none text-cyan-200" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{insight.title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-300">{insight.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Coach tone */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Coach Tone</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TONE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => patch({ coach_tone: opt.value })}
              className={`p-3 rounded-lg border text-left text-sm transition ${
                current.coach_tone === opt.value
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                  : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Detail level */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Response Detail</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {DETAIL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => patch({ detail_level: opt.value })}
              className={`p-3 rounded-lg border text-left text-sm transition ${
                current.detail_level === opt.value
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                  : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Domain weights */}
      <section>
        <h2 className="text-sm font-semibold mb-1">Domain Focus (1–10)</h2>
        <p className="text-xs text-gray-500 mb-3">Higher weight = more influence on your Life Score</p>
        <div className="space-y-3">
          {DOMAINS.map(domain => (
            <div key={domain} className="flex items-center gap-3">
              <span className="w-20 text-sm capitalize">{domain}</span>
              <input
                type="range"
                min={1}
                max={10}
                value={(current.domain_weights?.[domain] ?? 5)}
                onChange={e => {
                  const w = { ...current.domain_weights, [domain]: Number(e.target.value) };
                  patch({ domain_weights: w });
                }}
                className="flex-1 accent-indigo-500"
              />
              <span className="w-4 text-sm text-right text-gray-500">
                {current.domain_weights?.[domain] ?? 5}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Alert cadence */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Alert Cadence</h2>
        <div className="flex gap-2">
          {["minimal", "normal", "frequent"].map(c => (
            <button
              key={c}
              onClick={() => patch({ alert_cadence: c })}
              className={`px-4 py-2 rounded-lg border text-sm capitalize transition ${
                current.alert_cadence === c
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700"
                  : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Accent colour */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Accent Colour</h2>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLOURS.map(colour => (
            <button
              key={colour}
              onClick={() => patch({ accent_colour: colour })}
              style={{ background: colour }}
              className={`w-8 h-8 rounded-full transition ${
                current.accent_colour === colour ? "ring-2 ring-offset-2 ring-gray-400" : ""
              }`}
              aria-label={colour}
            />
          ))}
          <input
            type="color"
            value={current.accent_colour}
            onChange={e => patch({ accent_colour: e.target.value })}
            className="w-8 h-8 rounded-full border-none cursor-pointer"
            title="Custom colour"
          />
        </div>
      </section>

      {/* Layout density + font size */}
      <section className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold mb-3">Layout Density</h2>
          <div className="flex flex-col gap-2">
            {["compact", "comfortable", "spacious"].map(d => (
              <button
                key={d}
                onClick={() => patch({ layout_density: d })}
                className={`px-3 py-2 rounded-lg border text-sm capitalize text-left transition ${
                  current.layout_density === d
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold mb-3">Font Size</h2>
          <div className="flex flex-col gap-2">
            {["small", "medium", "large"].map(s => (
              <button
                key={s}
                onClick={() => patch({ font_size: s })}
                className={`px-3 py-2 rounded-lg border text-sm capitalize text-left transition ${
                  current.font_size === s
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
