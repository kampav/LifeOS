"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { usersApi, domainsApi, aiApi } from "@/lib/api";
import { DOMAINS } from "@/lib/utils";
import { LifeScore } from "@/components/life-os/LifeScore";
import { DomainCard } from "@/components/life-os/DomainCard";
import { QuickCapture } from "@/components/life-os/QuickCapture";
import { Sparkles } from "lucide-react";

const WheelOfLife = dynamic(
  () => import("@/components/life-os/WheelOfLife").then(m => m.WheelOfLife),
  { ssr: false, loading: () => <div className="bg-white rounded-2xl p-6 shadow-card h-[380px] animate-pulse" /> }
);

const AICoachChat = dynamic(
  () => import("@/components/life-os/AICoachChat").then(m => m.AICoachChat),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-gray-50 rounded-xl" /> }
);

export default function DashboardPage() {
  const [showChat, setShowChat] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => usersApi.me().then(r => r.data),
    retry: 1,
    staleTime: 300_000,
  });

  const { data: scoreData } = useQuery({
    queryKey: ["life-score"],
    queryFn: () => usersApi.score().then(r => r.data),
    retry: 1,
    staleTime: 300_000,
  });

  const { data: brief } = useQuery({
    queryKey: ["daily-brief"],
    queryFn: () => aiApi.dailyBrief().then(r => r.data),
    retry: false,
    staleTime: 3_600_000,
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
    retry: false,
    staleTime: 300_000,
  });

  const firstName = String(profile?.full_name || profile?.name || "").split(" ")[0] || "there";
  const lifeScore = typeof scoreData?.score === "number" ? scoreData.score : 0;

  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

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
        <button
          onClick={() => setShowChat(s => !s)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          AI Coach
        </button>
      </div>

      {/* Daily brief */}
      {brief?.brief ? (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 opacity-80" />
            <span className="text-sm font-semibold opacity-80">Today&apos;s Brief</span>
          </div>
          <p className="text-sm leading-relaxed opacity-95 line-clamp-3">{String(brief.brief)}</p>
        </div>
      ) : null}

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

      {/* Domain cards */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Life Domains</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {DOMAINS.map(d => (
            <DomainCard
              key={d.id}
              domainId={d.id}
              score={typeof domainScores?.[d.id] === "number" ? (domainScores[d.id] as number) : 0}
            />
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
