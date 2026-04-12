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
      <div className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer border border-transparent hover:border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: domain.color + "20" }}>
              <span className="w-3 h-3 rounded-full" style={{ background: domain.color }} />
            </span>
            <span className="font-semibold text-gray-900 text-sm">{domain.label}</span>
          </div>
          <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
        </div>

        {/* Score bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-2xl font-bold text-gray-900">{score}</span>
            <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: domain.color + "15", color: domain.color }}>
              {scoreLabel}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: domain.color }} />
          </div>
        </div>

        <p className="text-xs text-gray-400">{entryCount} logs this month</p>
      </div>
    </Link>
  );
}
