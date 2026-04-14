"use client";
import { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enGB } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PlannerEvent } from "@/components/life-os/PlannerEvent";
import type { PlannerItem } from "@/components/life-os/PlannerEvent";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-GB": enGB };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const VIEWS = ["Week", "Day", "Month", "Priority"] as const;
type View = typeof VIEWS[number];

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: PlannerItem;
}

function toCalendarEvent(item: PlannerItem): CalendarEvent {
  return {
    id: item.id,
    title: item.title,
    start: new Date(item.start_at),
    end: item.end_at ? new Date(item.end_at) : new Date(new Date(item.start_at).getTime() + 3600000),
    allDay: item.all_day,
    resource: item,
  };
}

export default function PlannerView() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("Week");
  const [date, setDate] = useState(new Date());

  const { data } = useQuery<PlannerItem[]>({
    queryKey: ["planner", view, date.toISOString().slice(0, 10)],
    queryFn: () =>
      api.get(`/planner?view=${view.toLowerCase()}&start=${date.toISOString()}`).then(r => r.data.items || []),
  });

  const { data: priorityItems } = useQuery<PlannerItem[]>({
    queryKey: ["planner-priority"],
    queryFn: () => api.get("/planner/priority").then(r => r.data),
    enabled: view === "Priority",
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/planner/items/${id}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planner"] });
      qc.invalidateQueries({ queryKey: ["planner-priority"] });
    },
  });

  const events: CalendarEvent[] = (data || []).map(toCalendarEvent);

  function handleSelectSlot({ start }: { start: Date }) {
    const title = prompt("Event title:");
    if (title?.trim()) {
      api.post("/planner/items", {
        title: title.trim(),
        start_at: start.toISOString(),
        item_type: "event",
      }).then(() => qc.invalidateQueries({ queryKey: ["planner"] }));
    }
  }

  return (
    <div className="flex flex-col h-full p-4">
      {/* View switcher */}
      <div className="flex gap-2 mb-4">
        {VIEWS.map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              view === v ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "Priority" ? (
        <div className="flex-1 overflow-y-auto space-y-2">
          {(priorityItems || []).map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
              <button
                onClick={() => completeMutation.mutate(item.id)}
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition ${
                  item.completed ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-indigo-400"
                }`}
              />
              <div className="flex-1">
                <p className={`text-sm font-medium ${item.completed ? "line-through text-gray-400" : "text-gray-900"}`}>
                  {item.title}
                </p>
                <p className="text-xs text-gray-400">{item.domain} · {item.priority}</p>
              </div>
            </div>
          ))}
          {!priorityItems?.length && (
            <div className="text-center py-12 text-gray-400 text-sm">No items — you're all caught up!</div>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <Calendar
            localizer={localizer}
            events={events}
            view={view.toLowerCase() as "week" | "day" | "month"}
            date={date}
            onNavigate={setDate}
            onView={() => {}}
            selectable
            onSelectSlot={handleSelectSlot}
            components={{ event: PlannerEvent as any }}
            style={{ height: "100%" }}
          />
        </div>
      )}
    </div>
  );
}
