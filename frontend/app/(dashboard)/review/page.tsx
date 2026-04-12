"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { aiApi } from "@/lib/api";
import { Sparkles, RefreshCw, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function ReviewPage() {
  const [generating, setGenerating] = useState(false);

  const { data: brief } = useQuery({
    queryKey: ["daily-brief"],
    queryFn: () => aiApi.dailyBrief().then(r => r.data),
    staleTime: 3_600_000,
  });

  const weeklyMutation = useMutation({
    mutationFn: () => aiApi.weeklyReview(),
    onMutate: () => setGenerating(true),
    onSettled: () => setGenerating(false),
  });

  const review = weeklyMutation.data?.data;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-500 text-sm">AI-generated insights from your life data</p>
        </div>
        <button
          onClick={() => weeklyMutation.mutate()}
          disabled={generating}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generating…" : "Weekly Review"}
        </button>
      </div>

      {/* Daily Brief */}
      {brief?.brief && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 opacity-80" />
            <span className="text-sm font-semibold opacity-80">Today's Daily Brief</span>
            <span className="ml-auto text-xs opacity-60">{format(new Date(), "EEEE, MMM d")}</span>
          </div>
          <p className="text-sm leading-relaxed opacity-95 whitespace-pre-line">{brief.brief}</p>
        </motion.div>
      )}

      {/* Weekly Review */}
      {review ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-semibold text-gray-900">Weekly Review</span>
            <span className="ml-auto text-xs text-gray-400">{format(new Date(), "MMM d, yyyy")}</span>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
            {review.review}
          </div>
        </motion.div>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-card text-center">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">No review yet</h3>
          <p className="text-gray-400 text-sm mb-6">Click "Weekly Review" to generate your AI-powered weekly analysis across all 10 life domains.</p>
          <button onClick={() => weeklyMutation.mutate()} disabled={generating}
            className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
            {generating ? "Generating your review…" : "Generate Weekly Review"}
          </button>
        </div>
      )}
    </div>
  );
}
