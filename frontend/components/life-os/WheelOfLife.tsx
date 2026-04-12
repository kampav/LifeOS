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
    <div className="bg-white rounded-2xl p-6 shadow-card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Wheel of Life</h3>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data}>
          <PolarGrid stroke="#F3F4F6" />
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
            fill="#6366F1"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(value: number) => [`${value}/100`, "Score"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #F3F4F6", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
