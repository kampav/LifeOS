"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, domainsApi, aiApi, api } from "@/lib/api";
import { DOMAINS } from "@/lib/utils";
import { DomainCard } from "@/components/life-os/DomainCard";
import { QuickCapture } from "@/components/life-os/QuickCapture";
import {
  ArrowUpRight,
  Brain,
  Calendar,
  CheckCircle,
  Clock3,
  Layers3,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";

const LifeScore = dynamic(
  () => import("@/components/life-os/LifeScore").then(m => m.LifeScore),
  { ssr: false, loading: () => <div className="w-40 h-40 rounded-full bg-slate-100 animate-pulse" /> }
);
const WheelOfLife = dynamic(
  () => import("@/components/life-os/WheelOfLife").then(m => m.WheelOfLife),
  { ssr: false, loading: () => <div className="panel rounded-3xl h-[380px] animate-pulse" /> }
);
const AICoachChat = dynamic(
  () => import("@/components/life-os/AICoachChat").then(m => m.AICoachChat),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-slate-100 rounded-2xl" /> }
);

const TABS = ["TODAY", "THIS WEEK", "THIS MONTH", "THIS YEAR"] as const;
type Tab = typeof TABS[number];

interface HomescreenData {
  today: { non_movable: unknown[]; tasks: unknown[]; habits: unknown[]; coaching_question: string };
  this_week: { tasks: unknown[]; goals: unknown[] };
  this_month: { tasks: unknown[]; goals: unknown[] };
  this_year: { tasks: unknown[]; goals: unknown[]; life_score_note?: string };
  generated_at: string;
  from_cache?: boolean;
}

function TaskRow({
  task,
  onComplete,
}: {
  task: { id: string; title: string; domain?: string; priority?: string };
  onComplete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50">
      <button
        onClick={() => onComplete(task.id)}
        className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-slate-300 transition hover:border-primary"
        aria-label={`Complete ${task.title}`}
      />
      <span className="flex-1 text-sm font-medium text-slate-800">{task.title}</span>
      {task.domain && <span className="text-[11px] font-bold capitalize text-slate-400">{task.domain}</span>}
    </div>
  );
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("TODAY");
  const [showChat, setShowChat] = useState(false);
  const [greeting, setGreeting] = useState("Welcome");
  const [dateLabel, setDateLabel] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    setDateLabel(new Date().toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => usersApi.me().then(r => r.data),
    staleTime: 300_000,
  });
  const { data: scoreData } = useQuery({
    queryKey: ["life-score"],
    queryFn: () => usersApi.score().then(r => r.data),
    staleTime: 300_000,
  });
  const { data: domainScores } = useQuery({
    queryKey: ["domain-scores"],
    queryFn: async () => {
      const results = await Promise.allSettled(
        DOMAINS.map(d => domainsApi.score(d.id).then(r => ({ id: d.id, score: r.data.score as number })))
      );
      const out: Record<string, number> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") out[DOMAINS[i].id] = r.value.score;
      });
      return out;
    },
    staleTime: 300_000,
  });
  const { data: brief } = useQuery({
    queryKey: ["daily-brief"],
    queryFn: () => aiApi.dailyBrief().then(r => r.data),
    retry: false,
    staleTime: 3_600_000,
  });

  const { data: homescreen, isLoading: hsLoading, refetch: hsRefetch } = useQuery<HomescreenData>({
    queryKey: ["homescreen"],
    queryFn: () => api.get("/homescreen").then(r => r.data),
    staleTime: 300_000,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/homescreen/items/${id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homescreen"] }),
  });

  const firstName = String(profile?.full_name || profile?.name || "").split(" ")[0] || "there";
  const lifeScore = typeof scoreData?.score === "number" ? scoreData.score : 0;
  const totalTasks = homescreen ? homescreen.today.tasks.length + homescreen.this_week.tasks.length : 0;
  const topDomain = Object.entries(domainScores ?? {}).sort((a, b) => b[1] - a[1])[0];

  function getTabData() {
    if (!homescreen) return { tasks: [], goals: [], non_movable: [], habits: [], coaching_question: "" };
    if (tab === "TODAY") return { ...homescreen.today, goals: [] };
    if (tab === "THIS WEEK") return { ...homescreen.this_week, non_movable: [], habits: [], coaching_question: "" };
    if (tab === "THIS MONTH") return { ...homescreen.this_month, non_movable: [], habits: [], coaching_question: "" };
    return { ...homescreen.this_year, non_movable: [], habits: [], coaching_question: "" };
  }

  const tabData = getTabData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-2">
      <section className="panel-dark relative mb-6 overflow-hidden rounded-[2rem] p-5 text-white md:p-7">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-bold text-cyan-100">
              <Clock3 className="h-3.5 w-3.5" />
              <span suppressHydrationWarning>{dateLabel || "Today"}</span>
            </div>
            <h1 suppressHydrationWarning className="mt-4 max-w-2xl text-3xl font-black tracking-tight md:text-5xl">
              {greeting}, {firstName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Your life cockpit is tuned for today: priorities, domains, plans, and coaching in one place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[26rem]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Life Score</div>
              <div className="mt-1 text-3xl font-black">{lifeScore}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tasks</div>
              <div className="mt-1 text-3xl font-black">{totalTasks}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Focus</div>
              <div className="mt-1 truncate text-lg font-black capitalize">{topDomain?.[0] || "Start"}</div>
            </div>
          </div>
        </div>
      </section>

      {brief?.brief && (
        <section className="panel mb-6 rounded-3xl p-5">
          <div className="mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="metric-label">Today's Brief</span>
          </div>
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-700">{String(brief.brief)}</p>
        </section>
      )}

      <section className="mb-6 grid gap-6 md:grid-cols-3">
        <div className="panel flex flex-col items-center justify-center rounded-3xl p-6">
          <p className="metric-label mb-3">Life Score</p>
          <LifeScore score={lifeScore} size="lg" />
          <button
            onClick={() => setShowChat(s => !s)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <Sparkles className="h-4 w-4" />
            AI Coach
          </button>
        </div>
        <div className="md:col-span-2">
          <WheelOfLife scores={domainScores ?? {}} />
        </div>
      </section>

      <section className="panel mb-6 overflow-hidden rounded-3xl">
        <div className="flex border-b border-slate-100 px-3 sm:px-4">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-4 text-[11px] font-black tracking-wide transition sm:px-4 ${
                tab === t ? "border-slate-950 text-slate-950" : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
          <button onClick={() => hsRefetch()} className="ml-auto p-3 text-slate-400 transition hover:text-primary" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="p-5">
          {hsLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-9 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          )}

          {!hsLoading && (
            <>
              {tab === "TODAY" && (tabData as { non_movable: { id: string; title: string }[] }).non_movable?.length > 0 && (
                <div className="mb-4">
                  <h3 className="metric-label mb-2 text-red-500">Fixed Events</h3>
                  {(tabData as any).non_movable.map((item: { id: string; title: string }) => (
                    <div key={item.id} className="flex items-center gap-2 py-1 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-red-400" />
                      <span className="font-semibold text-slate-800">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {(tabData.tasks as { id: string; title: string; domain?: string; priority?: string }[])?.length > 0 && (
                <div className="mb-4">
                  <h3 className="metric-label mb-2">{tab === "TODAY" ? "Top Tasks" : "Tasks"}</h3>
                  {(tabData.tasks as { id: string; title: string; domain?: string; priority?: string }[]).slice(0, 7).map(task => (
                    <TaskRow key={task.id} task={task} onComplete={id => completeMutation.mutate(id)} />
                  ))}
                </div>
              )}

              {(tabData.goals as { title: string; domain?: string; current_value?: number; target_value?: number }[])?.length > 0 && (
                <div className="mb-4">
                  <h3 className="metric-label mb-2">Goals</h3>
                  {(tabData.goals as { title: string; domain?: string; current_value?: number; target_value?: number }[]).slice(0, 5).map((goal, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50">
                      <Target className="h-4 w-4 flex-shrink-0 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{goal.title}</p>
                        {goal.target_value && (
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                            <div
                              className="h-1.5 rounded-full bg-primary"
                              style={{ width: `${Math.min(100, ((goal.current_value || 0) / goal.target_value) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {goal.domain && <span className="text-[11px] font-bold capitalize text-slate-400">{goal.domain}</span>}
                    </div>
                  ))}
                </div>
              )}

              {tab === "TODAY" && (tabData as any).habits?.length > 0 && (
                <div className="mb-4">
                  <h3 className="metric-label mb-2">Habits Due</h3>
                  {(tabData as any).habits.slice(0, 5).map((h: { id: string; name: string }) => (
                    <div key={h.id} className="flex items-center gap-2 py-1 text-sm font-medium text-slate-700">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      {h.name}
                    </div>
                  ))}
                </div>
              )}

              {tab === "TODAY" && (tabData as any).coaching_question && (
                <div className="rounded-2xl bg-blue-50 p-4 text-sm font-medium text-blue-800">
                  {(tabData as any).coaching_question}
                </div>
              )}

              {tab === "THIS YEAR" && (tabData as any).life_score_note && (
                <p className="mt-2 text-xs text-slate-400">{(tabData as any).life_score_note}</p>
              )}

              {!tabData.tasks?.length && !tabData.goals?.length && (
                <div className="py-8 text-center text-sm text-slate-400">
                  Nothing planned for {tab.toLowerCase()}. Add tasks from the Kanban board.
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="metric-label">Operating System</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Life Domains</h2>
          </div>
          <div className="hidden items-center gap-2 text-xs font-bold text-slate-500 sm:flex">
            <Layers3 className="h-4 w-4" />
            Balanced view
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {DOMAINS.map(d => (
            <DomainCard
              key={d.id}
              domainId={d.id}
              score={typeof domainScores?.[d.id] === "number" ? (domainScores[d.id] as number) : 0}
            />
          ))}
        </div>
      </section>

      {showChat && (
        <section className="panel mb-6 rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-bold text-slate-950">AI Life Coach</span>
            <button
              onClick={() => setShowChat(false)}
              className="inline-flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-slate-700"
            >
              Close <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <AICoachChat initialMessage={`Hi ${firstName}! What would you like to work on today?`} />
        </section>
      )}

      <QuickCapture />
    </div>
  );
}

