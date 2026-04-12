"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  color?: string;
}

export function MetricTile({ label, value, unit, trend = "flat", trendValue, color = "#6366F1" }: Props) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "#10B981" : trend === "down" ? "#EF4444" : "#9CA3AF";

  return (
    <div className="bg-white rounded-2xl p-5 shadow-card">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-400 mb-1">{unit}</span>}
      </div>
      {trendValue && (
        <div className="flex items-center gap-1 mt-2">
          <TrendIcon className="w-3 h-3" style={{ color: trendColor }} />
          <span className="text-xs font-medium" style={{ color: trendColor }}>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
