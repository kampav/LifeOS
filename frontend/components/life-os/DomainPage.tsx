"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { domainsApi, goalsApi } from "@/lib/api";
import { getDomain } from "@/lib/utils";
import { LifeScore } from "./LifeScore";
import { MetricTile } from "./MetricTile";
import { GoalProgress } from "./GoalProgress";
import { EntryForm } from "./EntryForm";
import { AICoachChat } from "./AICoachChat";
import { InsightCard } from "./InsightCard";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Plus, MessageCircle, X } from "lucide-react";
import { format, parseISO } from "date-fns";

interface DomainConfig {
  quickMetrics?: Array<{ key: string; label: string; unit: string }>;
  chartMetric?: string;
}

interface Props {
  domainId: string;
  config?: DomainConfig;
}

export function DomainPage({ domainId, config = {} }: Props) {
  const domain = getDomain(domainId);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const { data: dash, isLoading } = useQuery({
    queryKey: ["domain-dashboard", domainId],
    queryFn: () => domainsApi.dashboard(domainId).then(r => r.data),
    staleTime: 120_000,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", domainId],
    queryFn: () => goalsApi.list({ domain: domainId }).then(r => r.data),
    staleTime: 120_000,
  });

  const { data: insights } = useQuery({
    queryKey: ["insights", domainId],
    queryFn: () => domainsApi.insights(domainId).then(r => r.data),
    staleTime: 3_600_000,
  });

  // Build chart data from recent entries
  const chartData = (dash?.recent_entries || [])
    .filter((e: Record<string, unknown>) => e.value != null)
    .slice(0, 14)
    .reverse()
    .map((e: Record<string, unknown>) => ({
      date: format(parseISO(e.logged_at as string), "MMM d"),
      value: e.value,
      label: e.title,
    }));

  if (!domain) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: domain.color + "20" }}>
            <span className="w-4 h-4 rounded-full" style={{ background: domain.color }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{domain.label}</h1>
            <p className="text-gray-400 text-sm">{dash?.entry_count_30d ?? 0} entries this month</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowChat(s => !s)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${showChat ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Coach</span>
          </button>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">
            <Plus className="w-4 h-4" /> Log
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${showChat ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
        <div className={showChat ? "lg:col-span-2 space-y-6" : "space-y-6"}>

          {/* Score + Quick metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-card flex flex-col items-center justify-center">
              <p className="text-xs text-gray-400 mb-2">Score</p>
              <LifeScore score={dash?.score ?? 0} size="sm" />
            </div>
            <MetricTile label="Goals Active" value={goals.filter((g: Record<string, unknown>) => g.status === "active").length} trend="flat" />
            <MetricTile label="Entries (30d)" value={dash?.entry_count_30d ?? 0} trend="flat" />
            <MetricTile label="Habits" value={dash?.habits?.length ?? 0} trend="flat" />
          </div>

          {/* Entry form inline */}
          {showForm && (
            <div className="bg-white rounded-2xl p-6 shadow-card">
              <EntryForm
                domain={domainId}
                onSuccess={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["domain-dashboard", domainId] }); }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {/* Trend chart */}
          {chartData.length > 1 && (
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`grad-${domainId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={domain.color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={domain.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #F3F4F6", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="value" stroke={domain.color} strokeWidth={2} fill={`url(#grad-${domainId})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Goal progress */}
          {goals.length > 0 && <GoalProgress goals={goals} />}

          {/* AI Insight */}
          {insights?.insights ? (
            <InsightCard domain={domainId} content={insights.insights} />
          ) : null}

          {/* Recent entries */}
          {(dash?.recent_entries?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-card">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Entries</h3>
              <div className="space-y-2">
                {dash.recent_entries.slice(0, 8).map((e: Record<string, unknown>) => (
                  <div key={e.id as string} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm text-gray-800">{(e.title as string) || (e.entry_type as string)}</p>
                      {e.notes ? <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{e.notes as string}</p> : null}
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      {e.value != null ? (
                        <p className="text-sm font-semibold text-gray-900">{e.value as number} <span className="text-gray-400 font-normal text-xs">{e.unit as string}</span></p>
                      ) : null}
                      <p className="text-xs text-gray-400">{format(parseISO(e.logged_at as string), "MMM d")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Chat sidebar */}
        {showChat && (
          <div className="lg:col-span-1 h-[600px]">
            <AICoachChat domain={domainId} initialMessage={`I'm here to help with your ${domain.label} journey. What's on your mind?`} />
          </div>
        )}
      </div>
    </div>
  );
}
