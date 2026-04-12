"use client";
import { Sparkles } from "lucide-react";
import { getDomain } from "@/lib/utils";

interface Props {
  domain: string;
  content: string;
}

export function InsightCard({ domain, content }: Props) {
  const d = getDomain(domain);
  return (
    <div className="rounded-2xl p-5 shadow-card" style={{ background: `linear-gradient(135deg, ${d?.color}15, ${d?.color}08)`, border: `1px solid ${d?.color}20` }}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4" style={{ color: d?.color }} />
        <span className="text-sm font-semibold" style={{ color: d?.color }}>AI Insights</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  );
}
