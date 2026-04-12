"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usersApi, domainsApi, aiApi } from "@/lib/api";
import { DOMAINS } from "@/lib/utils";
import { WheelOfLife } from "@/components/life-os/WheelOfLife";
import { LifeScore } from "@/components/life-os/LifeScore";
import { DomainCard } from "@/components/life-os/DomainCard";
import { AICoachChat } from "@/components/life-os/AICoachChat";
import { Sparkles } from "lucide-react";
import { QuickCapture } from "@/components/life-os/QuickCapture";

export default function DashboardPage() {
  const [showChat, setShowChat] = useState(false);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => usersApi.me().then(r => r.data) });
  const { data: scoreData } = useQuery({ queryKey: ["life-score"], queryFn: () => usersApi.score().then(r => r.data) });
  const { data: brief } = useQuery({ queryKey: ["daily-brief"], queryFn: () => aiApi.dailyBrief().then(r => r.data), staleTime: 3_600_000 });

  // Fetch scores for top domains
  const { data: domainScores } = useQuery({
    queryKey: ["domain-scores"],
    queryFn: async () => {
      const results = await Promise.allSettled(
        DOMAINS.map(d => domainsApi.score(d.id).then(r => ({ id: d.id, score: r.data.score })))
      );
      return Object.fromEntries(
        results.filter(r => r.status === "fulfilled").map(r => [(r as PromiseFulfilledResult<{id:string;score:number}>).value.id, (r as PromiseFulfilledResult<{id:string;score:number}>).value.score])
      );
    },
    staleTime: 3_600_000,
  });

  const firstName = profile?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, {firstName} 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <button onClick={() => setShowChat(s => !s)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          <Sparkles className="w-4 h-4" />
          Coach
        </button>
      </div>

      {/* Daily brief */}
      {brief?.brief && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 opacity-80" />
            <span className="text-sm font-semibold opacity-80">Today's Brief</span>
          </div>
          <p className="text-sm leading-relaxed opacity-95 line-clamp-3">{brief.brief}</p>
        </div>
      )}

      <div className={`grid gap-6 ${showChat ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
        <div className={showChat ? "lg:col-span-2" : ""}>
          {/* Life Score + Wheel */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-card flex flex-col items-center justify-center">
              <p className="text-sm font-medium text-gray-500 mb-3">Life Score</p>
              <LifeScore score={scoreData?.score ?? 0} size="lg" />
            </div>
            <div className="md:col-span-2">
              <WheelOfLife scores={domainScores ?? {}} />
            </div>
          </div>

          {/* Domain cards grid */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Life Domains</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {DOMAINS.map(d => (
                <DomainCard key={d.id} domainId={d.id} score={domainScores?.[d.id] ?? 0} />
              ))}
            </div>
          </div>
        </div>

        {/* AI Chat panel */}
        {showChat && (
          <div className="lg:col-span-1 h-[600px]">
            <AICoachChat initialMessage={`Hi ${firstName}! I've reviewed your life data. What would you like to work on today?`} />
          </div>
        )}
      </div>

      <QuickCapture />
    </div>
  );
}
