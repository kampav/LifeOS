"use client";
// Recharts wrappers for Finance page — must only be loaded with dynamic(ssr:false)
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from "recharts";

export function SpendBarChart({ data }: { data: { category: string; amount: number; pct: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <XAxis dataKey="category" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.replace(/_/g, " ")} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `£${v}`} />
        <Tooltip formatter={(v: number) => [`£${v.toFixed(2)}`, "Spent"]} labelFormatter={(l: string) => l.replace(/_/g, " ")} />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={i === 0 ? "#6366f1" : "#a5b4fc"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NetWorthLineChart({ data }: { data: { snapshot_date: string; net_worth: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <XAxis dataKey="snapshot_date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(0, 7)} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => [`£${Number(v).toLocaleString()}`, "Net Worth"]} />
        <Line type="monotone" dataKey="net_worth" stroke="#6366f1" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
