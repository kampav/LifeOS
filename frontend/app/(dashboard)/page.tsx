"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, domainsApi, aiApi, api, personalisationApi } from "@/lib/api";
import { DOMAINS } from "@/lib/utils";
import { DomainCard } from "@/components/life-os/DomainCard";
import { QuickCapture } from "@/components/life-os/QuickCapture";
import {
  ArrowUpRight,
  Brain,
  Calendar,
  CheckCircle,
  Clock3,
  Compass,
  Flame,
  Gift,
  Gauge,
  Layers3,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Zap,
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
  today?: { non_movable?: unknown[] | null; tasks?: unknown[] | null; habits?: unknown[] | null; coaching_question?: string | null } | null;
  this_week?: { tasks?: unknown[] | null; goals?: unknown[] | null } | null;
  this_month?: { tasks?: unknown[] | null; goals?: unknown[] | null } | null;
  this_year?: { tasks?: unknown[] | null; goals?: unknown[] | null; life_score_note?: string | null } | null;
  generated_at?: string;
  from_cache?: boolean;
}

interface LearningResponse {
  most_engaged_domain: string;
  least_engaged_domain: string;
  suggested_tone: number;
  suggested_detail_level: number;
  suggested_domain_weights: Record<string, number>;
  confidence: "low" | "medium" | "high";
  sample_size: number;
}

type TaskItem = { id: string; title: string; domain?: string; priority?: string };
type HabitItem = { id: string; name: string; domain?: string };
type FixedItem = { id: string; title: string };
type NextAction =
  | { kind: "link"; label: string; reason: string; cta: string; href: string }
  | { kind: "task"; label: string; reason: string; cta: string; taskId: string }
  | { kind: "capture"; label: string; reason: string; cta: string };

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function validTask(item: TaskItem): item is TaskItem {
  return Boolean(item?.id && item?.title);
}

function validHabit(item: HabitItem): item is HabitItem {
  return Boolean(item?.id && item?.name);
}

function validFixedItem(item: FixedItem): item is FixedItem {
  return Boolean(item?.id && item?.title);
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

function scoreCopy(score: number) {
  if (score >= 80) return "Protect the system that is working.";
  if (score >= 60) return "Good base. One focused action compounds today.";
  if (score >= 40) return "Choose a small win. Momentum matters more than volume.";
  return "Make the next step tiny enough to do now.";
}

function stableIndex(seed: string, length: number) {
  if (length <= 1) return 0;
  return seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % length;
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("TODAY");
  const [showChat, setShowChat] = useState(false);
  const [greeting, setGreeting] = useState("Welcome");
  const [dateLabel, setDateLabel] = useState("");
  const [dayKey, setDayKey] = useState("");
  const [insightRevealed, setInsightRevealed] = useState(false);

  useEffect(() => {
    try {
      const now = new Date();
      const h = now.getHours();
      const key = now.toISOString().slice(0, 10);
      setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
      setDateLabel(now.toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" }));
      setDayKey(key);
      setInsightRevealed(window.localStorage.getItem(`lifeos-insight-${key}`) === "revealed");
    } catch {
      setGreeting("Welcome");
      setDateLabel("Today");
    }
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

  const { data: learning } = useQuery<LearningResponse>({
    queryKey: ["personalisation-learning"],
    queryFn: () => personalisationApi.learning().then(r => r.data),
    retry: false,
    staleTime: 300_000,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/homescreen/items/${id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homescreen"] }),
  });

  const tuneMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => personalisationApi.patch(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personalisation"] });
      qc.invalidateQueries({ queryKey: ["personalisation-learning"] });
    },
  });

  const firstName = String(profile?.full_name || profile?.name || "").split(" ")[0] || "there";
  const lifeScore = typeof scoreData?.score === "number" ? scoreData.score : 0;
  const todayTasks = asArray<TaskItem>(homescreen?.today?.tasks).filter(validTask);
  const todayHabits = asArray<HabitItem>(homescreen?.today?.habits).filter(validHabit);
  const fixedItems = asArray<FixedItem>(homescreen?.today?.non_movable).filter(validFixedItem);
  const weekTasks = asArray<TaskItem>(homescreen?.this_week?.tasks).filter(validTask);
  const totalTasks = todayTasks.length + weekTasks.length;
  const domainEntries = Object.entries(domainScores ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === "number");
  const topDomain = domainEntries.sort((a, b) => b[1] - a[1])[0];
  const quietDomain = Object.entries(domainScores ?? {}).sort((a, b) => a[1] - b[1])[0];
  const topDomainMeta = DOMAINS.find(d => d.id === topDomain?.[0]);
  const quietDomainMeta = DOMAINS.find(d => d.id === quietDomain?.[0]);
  const momentumTotal = fixedItems.length + todayTasks.length + todayHabits.length;
  const momentumScore = Math.min(100, Math.max(12, 100 - momentumTotal * 9));

  const nextAction: NextAction = fixedItems[0]
    ? {
        kind: "link",
        label: fixedItems[0].title,
        reason: "Fixed commitment is the strongest trigger because it has a real-world time anchor.",
        cta: "Open planner",
        href: "/planner",
      }
    : todayTasks[0]
      ? {
          kind: "task",
          label: todayTasks[0].title,
          reason: "This is the lowest-friction action already waiting in your system.",
          cta: "Complete it",
          taskId: todayTasks[0].id,
        }
      : todayHabits[0]
        ? {
            kind: "link",
            label: todayHabits[0].name,
            reason: "A small repeated behaviour protects the habit loop.",
            cta: "Open habits",
            href: "/habits",
          }
        : {
            kind: "capture",
            label: quietDomainMeta ? `Add one signal for ${quietDomainMeta.label}` : "Capture one useful signal",
            reason: "Life OS gets smarter when every quiet domain receives a lightweight update.",
            cta: "Quick capture",
          };

  const rewardCards = [
    {
      title: topDomainMeta ? `${topDomainMeta.label} is carrying momentum` : "Your strongest signal is emerging",
      body: topDomainMeta
        ? `Your current pattern points to ${topDomainMeta.label}. Protect it with one deliberate action today.`
        : "Life OS will surface stronger behavioural patterns as you capture more signal.",
    },
    {
      title: quietDomainMeta ? `${quietDomainMeta.label} is your blind spot` : "A quiet domain needs attention",
      body: quietDomainMeta
        ? `One tiny update in ${quietDomainMeta.label} will improve tomorrow's recommendations.`
        : "A single log creates the next useful recommendation.",
    },
    {
      title: "The smallest action wins",
      body: scoreCopy(lifeScore),
    },
    {
      title: "Your system learns from investment",
      body: "Choosing what matters today gives Life OS a better signal than passively browsing the dashboard.",
    },
  ];
  const reward = rewardCards[stableIndex(dayKey || firstName, rewardCards.length)];

  function revealInsight() {
    setInsightRevealed(true);
    try {
      if (dayKey) window.localStorage.setItem(`lifeos-insight-${dayKey}`, "revealed");
    } catch {
      // Local storage is optional; the interaction should still work.
    }
  }

  function applySuggestedTuning() {
    if (learning?.suggested_domain_weights) {
      tuneMutation.mutate({
        domain_weights: learning.suggested_domain_weights,
        coach_tone: learning.suggested_tone,
        detail_level: learning.suggested_detail_level,
      });
    }
  }

  function openQuickCapture() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("lifeos-open-quick-capture"));
    }
  }

  function getTabData() {
    if (tab === "TODAY") {
      return {
        tasks: todayTasks,
        goals: [],
        non_movable: fixedItems,
        habits: todayHabits,
        coaching_question: homescreen?.today?.coaching_question || "",
      };
    }
    if (tab === "THIS WEEK") {
      return {
        tasks: weekTasks,
        goals: asArray(homescreen?.this_week?.goals),
        non_movable: [],
        habits: [],
        coaching_question: "",
      };
    }
    if (tab === "THIS MONTH") {
      return {
        tasks: asArray(homescreen?.this_month?.tasks),
        goals: asArray(homescreen?.this_month?.goals),
        non_movable: [],
        habits: [],
        coaching_question: "",
      };
    }
    return {
      tasks: asArray(homescreen?.this_year?.tasks),
      goals: asArray(homescreen?.this_year?.goals),
      non_movable: [],
      habits: [],
      coaching_question: "",
      life_score_note: homescreen?.this_year?.life_score_note || "",
    };
  }

  const tabData = getTabData();
  const tabTasks = asArray<TaskItem>(tabData.tasks).filter(validTask);
  const tabGoals = asArray<{ title?: string; domain?: string; current_value?: number; target_value?: number }>(tabData.goals).filter(goal => Boolean(goal?.title));
  const tabFixedItems = asArray<FixedItem>(tabData.non_movable).filter(validFixedItem);
  const tabHabits = asArray<HabitItem>(tabData.habits).filter(validHabit);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-2">
      <section className="panel-dark glass-shine relative mb-6 overflow-hidden rounded-[2.25rem] p-5 text-white md:p-8">
        <div className="absolute inset-x-6 top-0 h-1 rounded-full colour-rail opacity-90" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.16),transparent_38%,rgba(255,255,255,0.08)_70%,transparent)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.16] px-3 py-1 text-xs font-bold text-cyan-50 backdrop-blur-xl">
              <Clock3 className="h-3.5 w-3.5" />
              <span suppressHydrationWarning>{dateLabel || "Today"}</span>
            </div>
            <h1 suppressHydrationWarning className="mt-4 max-w-3xl text-3xl font-black tracking-tight md:text-6xl">
              {greeting}, {firstName}. Build one return loop today.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Trigger, action, reward, investment. Life OS now guides the next useful behaviour instead of presenting a static dashboard.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Trigger", "Action", "Reward", "Investment"].map((step, index) => (
                <span key={step} className="rounded-full border border-white/15 bg-white/[0.13] px-3 py-1 text-xs font-bold text-slate-100 shadow-sm backdrop-blur-xl">
                  {index + 1}. {step}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[26rem]">
            <div className="soft-float rounded-3xl border border-white/15 bg-white/[0.14] p-4 shadow-2xl shadow-blue-950/10 backdrop-blur-2xl">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Life Score</div>
              <div className="mt-1 text-3xl font-black">{lifeScore}</div>
            </div>
            <div className="soft-float rounded-3xl border border-white/15 bg-white/[0.14] p-4 shadow-2xl shadow-blue-950/10 backdrop-blur-2xl [animation-delay:900ms]">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tasks</div>
              <div className="mt-1 text-3xl font-black">{totalTasks}</div>
            </div>
            <div className="soft-float rounded-3xl border border-white/15 bg-white/[0.14] p-4 shadow-2xl shadow-blue-950/10 backdrop-blur-2xl [animation-delay:1800ms]">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Focus</div>
              <div className="mt-1 truncate text-lg font-black capitalize">{topDomain?.[0] || "Start"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel glass-shine float-in rounded-[2rem] p-5">
          <div className="absolute inset-x-5 top-0 h-1 rounded-full colour-rail" />
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="metric-label">Next Best Action</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{nextAction.label}</h2>
            </div>
            <span className="rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-[11px] font-black text-emerald-700 backdrop-blur-xl">
              Guided
            </span>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">{nextAction.reason}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {nextAction.kind === "task" ? (
              <button
                onClick={() => completeMutation.mutate(nextAction.taskId)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <CheckCircle className="h-4 w-4" />
                {nextAction.cta}
              </button>
            ) : nextAction.kind === "link" ? (
              <Link
                href={nextAction.href}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <ArrowUpRight className="h-4 w-4" />
                {nextAction.cta}
              </Link>
            ) : (
              <button
                onClick={openQuickCapture}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <Zap className="h-4 w-4" />
                {nextAction.cta}
              </button>
            )}
            <button
              onClick={() => setShowChat(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/45 px-4 py-3 text-sm font-black text-slate-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white"
            >
              <Brain className="h-4 w-4" />
              Ask coach why
            </button>
          </div>
        </div>

        <div className="panel float-in rounded-[2rem] p-5 [animation-delay:100ms]">
          <div className="flex items-center justify-between">
            <div>
              <p className="metric-label">Variable Reward</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Today's unlock</h2>
            </div>
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div className={`mt-4 rounded-3xl border p-4 shadow-inner transition ${insightRevealed ? "border-blue-100/80 bg-blue-50/75" : "border-white/70 bg-white/40"}`}>
            {insightRevealed ? (
              <>
                <h3 className="font-black text-slate-950">{reward.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{reward.body}</p>
              </>
            ) : (
              <>
                <h3 className="font-black text-slate-950">One useful insight is waiting</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Reveal a small, behaviour-led recommendation for today. It changes as your data changes.
                </p>
              </>
            )}
          </div>
          <button
            onClick={revealInsight}
            disabled={insightRevealed}
            className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:bg-primary-dark disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            {insightRevealed ? "Unlocked for today" : "Reveal today's insight"}
          </button>
        </div>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="panel float-in rounded-[2rem] p-5 [animation-delay:150ms]">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <p className="metric-label">Momentum</p>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-5xl font-black tracking-tight text-slate-950">{momentumScore}</span>
            <span className="pb-2 text-sm font-bold text-slate-400">readiness</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/60 shadow-inner">
            <div className="h-2 rounded-full bg-orange-500 transition-all" style={{ width: `${momentumScore}%` }} />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Fewer unresolved commitments means more ability to act when the trigger appears.
          </p>
        </div>

        <div className="panel float-in rounded-[2rem] p-5 [animation-delay:250ms]">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-cyan-600" />
            <p className="metric-label">Hunt</p>
          </div>
          <h3 className="mt-4 text-xl font-black text-slate-950">
            {quietDomainMeta ? `Explore ${quietDomainMeta.label}` : "Find the next signal"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The most useful discovery is usually hiding in the domain with the least recent signal.
          </p>
          <Link
            href={quietDomainMeta ? `/${quietDomainMeta.id}` : "/more"}
            className="mt-4 inline-flex items-center gap-2 text-sm font-black text-primary"
          >
            Open domain <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="panel float-in rounded-[2rem] p-5 [animation-delay:350ms]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-violet-600" />
            <p className="metric-label">Investment</p>
          </div>
          <h3 className="mt-4 text-xl font-black text-slate-950">Teach Life OS what matters</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Every tuning choice makes tomorrow's recommendations more personal.
          </p>
          <button
            onClick={applySuggestedTuning}
            disabled={tuneMutation.isPending || !learning?.suggested_domain_weights}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-50"
          >
            <Gauge className="h-4 w-4" />
            Apply adaptive tuning
          </button>
        </div>
      </section>

      {brief?.brief && (
        <section className="panel mb-6 rounded-[2rem] p-5">
          <div className="mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="metric-label">Contextual Trigger</span>
          </div>
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-700">{String(brief.brief)}</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Designed for useful return behaviour, not empty engagement.
          </div>
        </section>
      )}

      <section className="mb-6 grid gap-6 md:grid-cols-3">
        <div className="panel glass-shine flex flex-col items-center justify-center rounded-[2rem] p-6">
          <p className="metric-label mb-3">Life Score</p>
          <LifeScore score={lifeScore} size="lg" />
          <button
            onClick={() => setShowChat(s => !s)}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <Sparkles className="h-4 w-4" />
            AI Coach
          </button>
        </div>
        <div className="md:col-span-2">
          <WheelOfLife scores={domainScores ?? {}} />
        </div>
      </section>

      <section className="panel mb-6 overflow-hidden rounded-[2rem]">
        <div className="flex border-b border-slate-100 px-3 sm:px-4">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-3 py-4 text-[11px] font-black tracking-wide transition sm:px-4 ${
                tab === t ? "border-transparent bg-clip-text text-transparent [background-image:linear-gradient(90deg,#2563EB,#14B8A6,#EC4899)]" : "border-transparent text-slate-400 hover:text-slate-700"
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
              {tab === "TODAY" && tabFixedItems.length > 0 && (
                <div className="mb-4">
                  <h3 className="metric-label mb-2 text-red-500">Fixed Events</h3>
                  {tabFixedItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 py-1 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-red-400" />
                      <span className="font-semibold text-slate-800">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {tabTasks.length > 0 && (
                <div className="mb-4">
                  <h3 className="metric-label mb-2">{tab === "TODAY" ? "Top Tasks" : "Tasks"}</h3>
                  {tabTasks.slice(0, 7).map(task => (
                    <TaskRow key={task.id} task={task} onComplete={id => completeMutation.mutate(id)} />
                  ))}
                </div>
              )}

              {tabGoals.length > 0 && (
                <div className="mb-4">
                  <h3 className="metric-label mb-2">Goals</h3>
                  {tabGoals.slice(0, 5).map((goal, i) => (
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

              {tab === "TODAY" && tabHabits.length > 0 && (
                <div className="mb-4">
                  <h3 className="metric-label mb-2">Habits Due</h3>
                  {tabHabits.slice(0, 5).map(h => (
                    <div key={h.id} className="flex items-center gap-2 py-1 text-sm font-medium text-slate-700">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      {h.name}
                    </div>
                  ))}
                </div>
              )}

              {tab === "TODAY" && tabData.coaching_question && (
                <div className="rounded-2xl bg-blue-50 p-4 text-sm font-medium text-blue-800">
                  {tabData.coaching_question}
                </div>
              )}

              {tab === "THIS YEAR" && "life_score_note" in tabData && tabData.life_score_note && (
                <p className="mt-2 text-xs text-slate-400">{tabData.life_score_note}</p>
              )}

              {!tabTasks.length && !tabGoals.length && (
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
        <section className="panel mb-6 rounded-[2rem] p-4">
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

