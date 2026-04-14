"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, domainsApi, aiApi, api } from "@/lib/api";
import { DOMAINS } from "@/lib/utils";
import { DomainCard } from "@/components/life-os/DomainCard";
import { QuickCapture } from "@/components/life-os/QuickCapture";
import { Sparkles, CheckCircle, Calendar, Target, RefreshCw } from "lucide-react";

const LifeScore = dynamic(
  () => import("@/components/life-os/LifeScore").then(m => m.LifeScore),
  { ssr: false, loading: () => <div className="w-40 h-40 rounded-full bg-gray-100 animate-pulse" /> }
);
const WheelOfLife = dynamic(
  () => import("@/components/life-os/WheelOfLife").then(m => m.WheelOfLife),
  { ssr: false, loading: () => <div className="bg-white rounded-2xl p-6 shadow-card h-[380px] animate-pulse" /> }
);
const AICoachChat = dynamic(
  () => import("@/components/life-os/AICoachChat").then(m => m.AICoachChat),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-gray-50 rounded-xl" /> }
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

function TaskRow({ task, onComplete }: { task: { id: string; title: string; domain?: string; priority?: string }; onComplete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <button onClick={() => onComplete(task.id)} className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-indigo-400 flex-shrink-0 transition" />
      <span className="text-sm text-gray-800 flex-1">{task.title}</span>
      {task.domain && <span className="text-xs text-gray-400 capitalize">{task.domain}</span>}
    </div>
  );
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("TODAY");
  const [showChat, setShowChat] = useState(false);
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => usersApi.me().then(r => r.data), staleTime: 300_000 });
  const { data: scoreData } = useQuery({ queryKey: ["life-score"], queryFn: () => usersApi.score().then(r => r.data), staleTime: 300_000 });
  const { data: domainScores } = useQuery({
    queryKey: ["domain-scores"],
    queryFn: async () => {
      const results = await Promise.allSettled(DOMAINS.map(d => domainsApi.score(d.id).then(r => ({ id: d.id, score: r.data.score as number }))));
      const out: Record<string, number> = {};
      results.forEach((r, i) => { if (r.status === "fulfilled") out[DOMAINS[i].id] = r.value.score; });
      return out;
    },
    staleTime: 300_000,
  });
  const { data: brief } = useQuery({ queryKey: ["daily-brief"], queryFn: () => aiApi.dailyBrief().then(r => r.data), retry: false, staleTime: 3_600_000 });

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

  function getTabData() {
    if (!homescreen) return { tasks: [], goals: [], non_movable: [], habits: [], coaching_question: "" };
    if (tab === "TODAY") return { ...homescreen.today, goals: [] };
    if (tab === "THIS WEEK") return { ...homescreen.this_week, non_movable: [], habits: [], coaching_question: "" };
    if (tab === "THIS MONTH") return { ...homescreen.this_month, non_movable: [], habits: [], coaching_question: "" };
    return { ...homescreen.this_year, non_movable: [], habits: [], coaching_question: "" };
  }

  const tabData = getTabData();

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 suppressHydrationWarning className="text-2xl font-bold text-gray-900">{greeting}, {firstName} 👋</h1>
          <p suppressHydrationWarning className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <button onClick={() => setShowChat(s => !s)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Sparkles className="w-4 h-4" />
          AI Coach
        </button>
      </div>

      {/* Daily brief */}
      {brief?.brief && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 opacity-80" />
            <span className="text-sm font-semibold opacity-80">Today&apos;s Brief</span>
          </div>
          <p className="text-sm leading-relaxed opacity-95 line-clamp-3">{String(brief.brief)}</p>
        </div>
      )}

      {/* Life Score + Wheel */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-card flex flex-col items-center justify-center">
          <p className="text-sm font-medium text-gray-500 mb-3">Life Score</p>
          <LifeScore score={lifeScore} size="lg" />
        </div>
        <div className="md:col-span-2">
          <WheelOfLife scores={domainScores ?? {}} />
        </div>
      </div>

      {/* 4-tab home screen panels */}
      <div className="bg-white rounded-2xl shadow-card mb-6">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 px-4">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-semibold tracking-wide transition border-b-2 -mb-px ${
                tab === t ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}>
              {t}
            </button>
          ))}
          <button onClick={() => hsRefetch()} className="ml-auto p-3 text-gray-400 hover:text-indigo-500 transition" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5">
          {hsLoading && <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />)}</div>}

          {!hsLoading && (
            <>
              {/* Non-movable events (TODAY only) */}
              {tab === "TODAY" && (tabData as { non_movable: { id: string; title: string }[] }).non_movable?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Fixed Events</h3>
                  {(tabData as any).non_movable.map((item: { id: string; title: string }) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm py-1">
                      <Calendar className="w-3.5 h-3.5 text-red-400" />
                      <span className="font-medium text-gray-800">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tasks */}
              {(tabData.tasks as { id: string; title: string; domain?: string; priority?: string }[])?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {tab === "TODAY" ? "Top Tasks" : "Tasks"}
                  </h3>
                  {(tabData.tasks as { id: string; title: string; domain?: string; priority?: string }[]).slice(0, 7).map(task => (
                    <TaskRow key={task.id} task={task} onComplete={id => completeMutation.mutate(id)} />
                  ))}
                </div>
              )}

              {/* Goals */}
              {(tabData.goals as { title: string; domain?: string; current_value?: number; target_value?: number }[])?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Goals</h3>
                  {(tabData.goals as { title: string; domain?: string; current_value?: number; target_value?: number }[]).slice(0, 5).map((goal, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <Target className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{goal.title}</p>
                        {goal.target_value && (
                          <div className="mt-1 h-1 bg-gray-100 rounded-full">
                            <div className="h-1 bg-indigo-400 rounded-full"
                              style={{ width: `${Math.min(100, ((goal.current_value || 0) / goal.target_value) * 100)}%` }} />
                          </div>
                        )}
                      </div>
                      {goal.domain && <span className="text-xs text-gray-400 capitalize">{goal.domain}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Habits due today */}
              {tab === "TODAY" && (tabData as any).habits?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Habits Due</h3>
                  {(tabData as any).habits.slice(0, 5).map((h: { id: string; name: string }) => (
                    <div key={h.id} className="flex items-center gap-2 py-1 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {h.name}
                    </div>
                  ))}
                </div>
              )}

              {/* Coaching question */}
              {tab === "TODAY" && (tabData as any).coaching_question && (
                <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700 italic">
                  💬 {(tabData as any).coaching_question}
                </div>
              )}

              {/* Life score note (THIS YEAR) */}
              {tab === "THIS YEAR" && (tabData as any).life_score_note && (
                <p className="text-xs text-gray-400 mt-2">{(tabData as any).life_score_note}</p>
              )}

              {/* Empty state */}
              {!tabData.tasks?.length && !tabData.goals?.length && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Nothing planned for {tab.toLowerCase()}. Add tasks from the Kanban board.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Domain cards */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Life Domains</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {DOMAINS.map(d => (
            <DomainCard key={d.id} domainId={d.id}
              score={typeof domainScores?.[d.id] === "number" ? (domainScores[d.id] as number) : 0} />
          ))}
        </div>
      </div>

      {/* AI Coach inline */}
      {showChat && (
        <div className="bg-white rounded-2xl shadow-card p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-900">AI Life Coach</span>
            <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
          </div>
          <AICoachChat initialMessage={`Hi ${firstName}! What would you like to work on today?`} />
        </div>
      )}

      <QuickCapture />
    </div>
  );
}
