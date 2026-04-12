"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { entriesApi } from "@/lib/api";
import { X } from "lucide-react";

const schema = z.object({
  entry_type: z.enum(["metric", "note", "event", "habit_check", "mood"]),
  title: z.string().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  notes: z.string().max(2000).optional(),
});
type Fields = z.infer<typeof schema>;

interface Props {
  domain: string;
  onSuccess: () => void;
  onCancel: () => void;
  defaultType?: Fields["entry_type"];
  fields?: Array<{ name: string; label: string; unit: string; type?: "number" | "text" }>;
}

export function EntryForm({ domain, onSuccess, onCancel, defaultType = "metric", fields = [] }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { entry_type: defaultType },
  });

  async function onSubmit(data: Fields) {
    setSaving(true);
    setError("");
    try {
      await entriesApi.create({ ...data, domain });
      onSuccess();
    } catch (e: unknown) {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Log Entry</h3>
        <button type="button" onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
        <select {...register("entry_type")} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="metric">Metric / Number</option>
          <option value="note">Note</option>
          <option value="event">Event</option>
          <option value="mood">Mood</option>
          <option value="habit_check">Habit Check</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Title / Description</label>
        <input {...register("title")} placeholder={fields[0]?.label || "What did you do?"} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
          <input {...register("value", { valueAsNumber: true })} type="number" step="any" placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
          <input {...register("unit")} placeholder={fields[0]?.unit || "kg, km, hrs..."} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
        <textarea {...register("notes")} rows={2} placeholder="Any additional context..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
      </div>

      {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
          {saving ? "Saving…" : "Log Entry"}
        </button>
      </div>
    </form>
  );
}
