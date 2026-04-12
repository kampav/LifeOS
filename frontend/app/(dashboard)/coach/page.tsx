"use client";
import { AICoachChat } from "@/components/life-os/AICoachChat";

export default function CoachPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 h-[calc(100vh-64px)] md:h-screen flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Life Coach</h1>
        <p className="text-gray-500 text-sm">Your personal coach — powered by your real data.</p>
      </div>
      <div className="flex-1 min-h-0">
        <AICoachChat />
      </div>
    </div>
  );
}
