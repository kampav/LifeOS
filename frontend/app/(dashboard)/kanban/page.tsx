"use client";
/**
 * Kanban board — dnd-kit drag-and-drop across 4 columns.
 * Must be dynamic(ssr:false) — dnd-kit uses browser APIs.
 */
import dynamic from "next/dynamic";

const KanbanBoard = dynamic(() => import("./KanbanBoard"), { ssr: false });

export default function KanbanPage() {
  return <KanbanBoard />;
}
