"use client";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { DOMAINS } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Props {
  scores: Record<string, number>;
}

export function WheelOfLife({ scores }: Props) {
  const router = useRouter();
  const data = DOMAINS.map(d => ({
    domain: d.label,
    id: d.id,
    score: scores[d.id] ?? 0,
    fullMark: 100,
  }));

  return (
    <div className="panel glass-shine rounded-[2rem] p-5 sm:p-6">
      <div className="absolute inset-x-6 top-0 h-1 rounded-full colour-rail opacity-70" />
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <p className="metric-label">Balance Map</p>
          <h3 className="text-xl font-black tracking-tight text-slate-950 mt-1">Wheel of Life</h3>
        </div>
        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
          10 domains
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data}>
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis
            dataKey="domain"
            tick={({ payload, x, y, textAnchor }) => {
              const domain = DOMAINS.find(d => d.label === payload.value);
              return (
                <text
                  x={x} y={y}
                  textAnchor={textAnchor}
                  fontSize={11}
                  fill={domain?.color || "#6B7280"}
                  style={{ cursor: "pointer", fontWeight: 500 }}
                  onClick={() => domain && router.push(`/${domain.id}`)}
                >
                  {payload.value}
                </text>
              );
            }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#6366F1"
            fill="#2563EB"
            fillOpacity={0.14}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(value: number) => [`${value}/100`, "Score"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 18px 44px rgba(15,23,42,0.12)" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
