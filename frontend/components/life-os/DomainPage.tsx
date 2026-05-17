"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { domainsApi, goalsApi } from "@/lib/api";
import { getDomain } from "@/lib/utils";
import { DOMAIN_CONTENT } from "@/lib/domainContent";
import { MetricTile } from "./MetricTile";
import { GoalProgress } from "./GoalProgress";
import { EntryForm } from "./EntryForm";
import { InsightCard } from "./InsightCard";
import { Plus, MessageCircle } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

const LifeScore = dynamic(
  () => import("./LifeScore").then(m => m.LifeScore),
  { ssr: false, loading: () => <div className="w-16 h-16 rounded-full bg-gray-100 animate-pulse" /> }
);

const AICoachChat = dynamic(
  () => import("./AICoachChat").then(m => m.AICoachChat),
  { ssr: false, loading: () => <div className="h-40 bg-gray-50 rounded-xl animate-pulse" /> }
);

const DomainChart = dynamic(
  () => import("./DomainChart").then(m => m.DomainChart),
  { ssr: false, loading: () => <div className="h-48 bg-gray-50 rounded-xl animate-pulse" /> }
);

interface DomainConfig {
  quickMetrics?: Array<{ key: string; label: string; unit: string }>;
  chartMetric?: string;
}

interface Props {
  domainId: string;
  config?: DomainConfig;
}

export function DomainPage({ domainId, config = {} }: Props) {
  const domain = getDomain(domainId);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const { data: dash, isLoading } = useQuery({
    queryKey: ["domain-dashboard", domainId],
    queryFn: () => domainsApi.dashboard(domainId).then(r => r.data),
    staleTime: 120_000,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", domainId],
    queryFn: () => goalsApi.list({ domain: domainId }).then(r => Array.isArray(r.data) ? r.data : []),
    staleTime: 120_000,
    retry: false,
  });

  const { data: insights } = useQuery({
    queryKey: ["insights", domainId],
    queryFn: () => domainsApi.insights(domainId).then(r => r.data),
    staleTime: 3_600_000,
  });

  const safeDate = (s: unknown) => {
    try { const d = parseISO(s as string); return isValid(d) ? format(d, "MMM d") : ""; } catch { return ""; }
  };

  const recentEntries = Array.isArray(dash?.recent_entries) ? dash.recent_entries : [];
  const habits = Array.isArray(dash?.habits) ? dash.habits : [];
  const activeGoals = Array.isArray(goals) ? goals.filter((g: Record<string, unknown>) => g.status === "active") : [];
  const content = DOMAIN_CONTENT[domainId] || {
    outcome: "Keep this area visible, intentional and easy to act on.",
    everyday: ["Tasks", "Goals", "Notes", "Events", "Habits"],
    suggestedCaptures: ["Add note", "Create task", "Schedule time", "Save learning"],
    nudge: "Choose one small action that makes this area clearer.",
  };

  // Build chart data from recent entries
  const chartData = recentEntries
    .filter((e: Record<string, unknown>) => e.value != null)
    .slice(0, 14)
    .reverse()
    .map((e: Record<string, unknown>) => ({
      date: safeDate(e.logged_at),
      value: e.value,
      label: e.title,
    }));

  if (!domain) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
      {/* Header */}
      <section className="relative mb-6 overflow-hidden rounded-[2rem] p-6 text-white md:p-8" style={{ background: `linear-gradient(135deg, ${domain.color} 0%, #6C3AFF 100%)` }}>
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/18">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{domain.icon}</span>
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">Life area</p>
                <h1 className="mt-1 text-4xl font-black tracking-tight">{domain.label}</h1>
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/80">{content.outcome}</p>
          </div>
          <div className="rounded-[1.5rem] bg-white/16 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-white/60">Today's nudge</p>
            <p className="mt-2 max-w-xs text-sm font-bold leading-6">{content.nudge}</p>
          </div>
        </div>
      </section>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="metric-label">Common things people manage here</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {content.everyday.map(item => (
              <span key={item} className="rounded-full bg-[var(--md-surface-container-high)] px-3 py-1 text-xs font-black text-slate-600 shadow-sm ring-1 ring-[var(--md-outline)]">{item}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowChat(s => !s)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${showChat ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Coach</span>
          </button>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg"
            style={{ background: domain.color }}>
            <Plus className="w-4 h-4" /> Log
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${showChat ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
        <div className={showChat ? "lg:col-span-2 space-y-6" : "space-y-6"}>

          {/* Score + Quick metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="panel rounded-2xl p-5 flex flex-col items-center justify-center">
              <p className="text-xs text-gray-400 mb-2">Score</p>
              <LifeScore score={dash?.score ?? 0} size="sm" />
            </div>
            <MetricTile label="Goals Active" value={activeGoals.length} trend="flat" />
            <MetricTile label="Entries (30d)" value={dash?.entry_count_30d ?? 0} trend="flat" />
            <MetricTile label="Habits" value={habits.length} trend="flat" />
          </div>

          <div className="panel rounded-[1.5rem] p-5">
            <h2 className="text-lg font-black text-slate-950">Quick captures</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {content.suggestedCaptures.map(item => (
                <button
                  key={item}
                  onClick={() => setShowForm(true)}
                  className="rounded-2xl border border-[var(--md-outline)] bg-[var(--md-surface)] px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:-translate-y-0.5"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Entry form inline */}
          {showForm && (
            <div className="panel rounded-2xl p-6">
              <EntryForm
                domain={domainId}
                onSuccess={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["domain-dashboard", domainId] }); }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {/* Trend chart */}
          {chartData.length > 1 && (
            <DomainChart data={chartData} color={domain.color} domainId={domainId} />
          )}

          {/* Goal progress */}
          {goals.length > 0 && <GoalProgress goals={goals} />}

          {/* AI Insight */}
          {insights?.insights ? (
            <InsightCard domain={domainId} content={insights.insights} />
          ) : null}

          {/* Recent entries */}
          {recentEntries.length > 0 && (
            <div className="panel rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Entries</h3>
              <div className="space-y-2">
                {recentEntries.slice(0, 8).map((e: Record<string, unknown>) => (
                  <div key={e.id as string} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm text-gray-800">{(e.title as string) || (e.entry_type as string)}</p>
                      {e.notes ? <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{e.notes as string}</p> : null}
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      {e.value != null ? (
                        <p className="text-sm font-semibold text-gray-900">{e.value as number} <span className="text-gray-400 font-normal text-xs">{e.unit as string}</span></p>
                      ) : null}
                      <p className="text-xs text-gray-400">{safeDate(e.logged_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Chat sidebar */}
        {showChat && (
          <div className="lg:col-span-1 h-[600px]">
            <AICoachChat domain={domainId} initialMessage={`I'm here to help with your ${domain.label} journey. What's on your mind?`} />
          </div>
        )}
      </div>
    </div>
  );
}
