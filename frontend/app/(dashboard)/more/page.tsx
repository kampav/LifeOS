"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DOMAINS, formatScore } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function MorePage() {
  const { data: scores } = useQuery({
    queryKey: ["life-score"],
    queryFn: () => api.get("/scores/all").then(r => r.data),
    staleTime: 300_000,
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">All Domains</h1>
      <p className="text-sm text-gray-500 mb-6">Tap a domain to log entries and view insights.</p>

      <div className="space-y-2">
        {DOMAINS.map((d, i) => {
          const score = scores?.domain_scores?.[d.id] ?? null;
          return (
            <motion.div key={d.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}>
              <Link href={`/${d.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-card hover:shadow-md transition-all active:scale-[0.98]">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: d.color + "20" }}>
                  {d.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{d.label}</p>
                  <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${score ?? 0}%`, background: d.color }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {score !== null && (
                    <span className="text-sm font-bold" style={{ color: d.color }}>{formatScore(score)}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-2 gap-3">
        {[
          { href: "/review", icon: "✨", label: "AI Reviews" },
          { href: "/settings", icon: "⚙️", label: "Settings" },
        ].map(l => (
          <Link key={l.href} href={l.href}
            className="flex items-center gap-2 bg-white rounded-2xl p-4 shadow-card hover:shadow-md transition-all">
            <span className="text-xl">{l.icon}</span>
            <span className="font-medium text-gray-700 text-sm">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
