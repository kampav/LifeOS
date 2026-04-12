"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Props {
  data: Array<{ date: string; value: unknown; label: unknown }>;
  color: string;
  domainId: string;
}

export function DomainChart({ data, color, domainId }: Props) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-card">
      <h3 className="font-semibold text-gray-900 mb-4">Recent Trend</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${domainId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={35} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #F3F4F6", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${domainId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
