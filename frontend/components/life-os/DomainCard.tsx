"use client";
import Link from "next/link";
import { DOMAINS, formatScore } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  domainId: string;
  score: number;
  entryCount?: number;
  trend?: "up" | "down" | "flat";
}

export function DomainCard({ domainId, score, entryCount = 0, trend = "flat" }: Props) {
  const domain = DOMAINS.find(d => d.id === domainId);
  if (!domain) return null;
  const { label: scoreLabel } = formatScore(score);
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "#10B981" : trend === "down" ? "#EF4444" : "#9CA3AF";

  return (
    <Link href={`/${domainId}`}>
      <div className="group panel rounded-2xl p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl flex items-center justify-center ring-1 ring-white/70" style={{ background: domain.color + "18" }}>
              <span className="w-3 h-3 rounded-full shadow-sm" style={{ background: domain.color }} />
            </span>
            <span className="font-bold text-slate-900 text-sm">{domain.label}</span>
          </div>
          <TrendIcon className="w-4 h-4 opacity-70 transition group-hover:opacity-100" style={{ color: trendColor }} />
        </div>

        {/* Score bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-3xl font-black tracking-tight text-slate-950">{score}</span>
            <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: domain.color + "15", color: domain.color }}>
              {scoreLabel}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: domain.color }} />
          </div>
        </div>

        <p className="text-xs font-medium text-slate-400">{entryCount} logs this month</p>
      </div>
    </Link>
  );
}
