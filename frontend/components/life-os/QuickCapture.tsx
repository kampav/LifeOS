"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { entriesApi } from "@/lib/api";
import { DOMAINS } from "@/lib/utils";
import { Plus, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

const schema = z.object({
  domain: z.string(),
  entry_type: z.enum(["metric", "note", "event", "habit_check", "mood"]),
  title: z.string().min(1),
  value: z.number().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
});
type Fields = z.infer<typeof schema>;

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const qc = useQueryClient();
  const { register, handleSubmit, reset, watch } = useForm<Fields>({
    defaultValues: { domain: "health", entry_type: "metric" },
  });
  const selectedDomain = watch("domain");
  const domain = DOMAINS.find(d => d.id === selectedDomain);

  async function onSubmit(data: Fields) {
    await entriesApi.create(data);
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["domain-dashboard", data.domain] });
    setTimeout(() => { setSaved(false); setOpen(false); reset(); }, 1200);
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-primary rounded-2xl shadow-xl flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105 z-40"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
              onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-1/2 md:-translate-x-1/2 md:max-w-md w-full bg-white md:rounded-2xl rounded-t-2xl p-6 z-50 shadow-2xl"
            >
              {saved ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                    <Check className="w-7 h-7 text-green-500" />
                  </div>
                  <p className="font-semibold text-gray-900">Logged!</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-lg">Quick Log</h3>
                    <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  {/* Domain picker */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {DOMAINS.map(d => (
                      <label key={d.id} className="cursor-pointer">
                        <input {...register("domain")} type="radio" value={d.id} className="sr-only" />
                        <div className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${selectedDomain === d.id ? "border-primary bg-primary/5" : "border-gray-100 hover:border-gray-200"}`}>
                          <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                          <span className="text-[10px] text-gray-600 text-center leading-tight">{d.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select {...register("entry_type")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                        <option value="metric">Metric</option>
                        <option value="note">Note</option>
                        <option value="event">Event</option>
                        <option value="mood">Mood</option>
                        <option value="habit_check">Habit</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                      <input {...register("value", { valueAsNumber: true })} type="number" step="any" placeholder="0"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">What did you do?</label>
                    <input {...register("title")} placeholder="e.g. Morning run, Weight, Slept 8hrs..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>

                  <button type="submit"
                    className="w-full py-3 rounded-xl font-medium text-white transition-colors"
                    style={{ background: domain?.color || "#6366F1" }}>
                    Log Entry
                  </button>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
