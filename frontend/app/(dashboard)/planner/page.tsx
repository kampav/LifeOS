"use client";
/**
 * Planner page — react-big-calendar for Week/Day/Month views.
 * Must be dynamic(ssr:false) — react-big-calendar uses browser APIs.
 */
import dynamic from "next/dynamic";

const PlannerView = dynamic(() => import("./PlannerView"), { ssr: false });

export default function PlannerPage() {
  return <PlannerView />;
}
