"use client";
import { formatScore } from "@/lib/utils";
import { motion } from "framer-motion";

interface Props {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function LifeScore({ score, size = "md" }: Props) {
  const { label, color } = formatScore(score);
  const sizes = { sm: { r: 36, w: 80, sw: 6 }, md: { r: 52, w: 120, sw: 8 }, lg: { r: 68, w: 160, sw: 10 } };
  const { r, w, sw } = sizes[size];
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: w, height: w }}>
        <svg width={w} height={w} className="-rotate-90">
          <circle cx={w / 2} cy={w / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
          <motion.circle
            cx={w / 2} cy={w / 2} r={r} fill="none" strokeWidth={sw}
            stroke={color} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold text-gray-900" style={{ fontSize: size === "lg" ? 28 : size === "md" ? 22 : 16 }}>{score}</span>
          <span className="text-gray-400 text-xs">/100</span>
        </div>
      </div>
      <span className="text-sm font-medium" style={{ color }}>{label}</span>
    </div>
  );
}
