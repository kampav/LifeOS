"use client";
import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { KanbanCard } from "@/components/life-os/KanbanCard";
import type { Task } from "@/components/life-os/KanbanCard";

const COLUMNS: { key: string; label: string; colour: string }[] = [
  { key: "todo", label: "To Do", colour: "border-t-gray-300" },
  { key: "in_progress", label: "In Progress", colour: "border-t-blue-400" },
  { key: "waiting", label: "Waiting", colour: "border-t-yellow-400" },
  { key: "done", label: "Done", colour: "border-t-green-400" },
];

const DOMAINS = ["", "health", "finance", "family", "social", "career", "growth", "property"];
const PRIORITIES = ["", "critical", "high", "medium", "low"];

interface KanbanData {
  todo: Task[];
  in_progress: Task[];
  waiting: Task[];
  done: Task[];
}

export default function KanbanBoard() {
  const qc = useQueryClient();
  const [domain, setDomain] = useState("");
  const [priority, setPriority] = useState("");
  const [q, setQ] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data, isLoading } = useQuery<KanbanData>({
    queryKey: ["kanban", domain, priority, q],
    queryFn: () => {
      const params = new URLSearchParams();
      if (domain) params.set("domain", domain);
      if (priority) params.set("priority", priority);
      if (q) params.set("q", q);
      return api.get(`/kanban?${params.toString()}`).then(r => r.data);
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status, position }: { id: string; status: string; position: number }) =>
      api.post(`/tasks/${id}/move`, { status, position }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kanban"] }),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => api.post("/tasks", { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kanban"] }),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find which column the card landed in
    const targetColKey = COLUMNS.find(c =>
      (data?.[c.key as keyof KanbanData] || []).some(t => t.id === over.id)
    )?.key || (over.id as string);

    const sourceColKey = COLUMNS.find(c =>
      (data?.[c.key as keyof KanbanData] || []).some(t => t.id === active.id)
    )?.key;

    if (!sourceColKey || !targetColKey) return;

    // Optimistic update
    qc.setQueryData(["kanban", domain, priority, q], (old: KanbanData | undefined) => {
      if (!old) return old;
      const task = (old[sourceColKey as keyof KanbanData] || []).find(t => t.id === active.id);
      if (!task) return old;
      const newData = { ...old };
      newData[sourceColKey as keyof KanbanData] = old[sourceColKey as keyof KanbanData].filter(t => t.id !== active.id);
      const targetList = [...(old[targetColKey as keyof KanbanData] || [])];
      const overIdx = targetList.findIndex(t => t.id === over.id);
      targetList.splice(overIdx >= 0 ? overIdx : targetList.length, 0, { ...task, status: targetColKey });
      newData[targetColKey as keyof KanbanData] = targetList;
      return newData;
    });

    moveMutation.mutate({ id: active.id as string, status: targetColKey, position: 0 });
  }

  function addTask(colKey: string) {
    const title = prompt("Task title:");
    if (title?.trim()) createMutation.mutate(title.trim());
  }

  if (isLoading) return <div className="p-6 text-sm text-gray-500">Loading board…</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search tasks…"
            className="bg-transparent text-sm focus:outline-none w-40"
          />
        </div>
        <select value={domain} onChange={e => setDomain(e.target.value)}
          className="text-sm bg-gray-50 rounded-lg px-3 py-1.5 border-none focus:outline-none capitalize">
          {DOMAINS.map(d => <option key={d} value={d}>{d || "All domains"}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)}
          className="text-sm bg-gray-50 rounded-lg px-3 py-1.5 border-none focus:outline-none capitalize">
          {PRIORITIES.map(p => <option key={p} value={p}>{p || "All priorities"}</option>)}
        </select>
      </div>

      {/* Board */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(col => {
              const tasks = data?.[col.key as keyof KanbanData] || [];
              return (
                <div key={col.key} className={`w-72 flex flex-col bg-gray-50 rounded-xl border-t-4 ${col.colour}`}>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                      <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">{tasks.length}</span>
                    </div>
                    <button onClick={() => addTask(col.key)} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-indigo-500 hover:bg-white transition">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                    <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {tasks.map(task => (
                        <KanbanCard key={task.id} task={task} onClick={setSelectedTask} />
                      ))}
                    </SortableContext>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DndContext>

      {/* Task detail slide panel */}
      {selectedTask && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setSelectedTask(null)}>
          <div className="w-96 bg-white shadow-xl h-full p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{selectedTask.title}</h2>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <div><span className="font-medium">Status:</span> {selectedTask.status}</div>
              <div><span className="font-medium">Domain:</span> {selectedTask.domain || "—"}</div>
              <div><span className="font-medium">Priority:</span> {selectedTask.priority}</div>
              {selectedTask.due_date && <div><span className="font-medium">Due:</span> {selectedTask.due_date}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
