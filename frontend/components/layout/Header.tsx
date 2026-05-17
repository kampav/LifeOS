"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { api } from "@/lib/api";
import { format, parseISO } from "date-fns";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications?limit=15").then(r => Array.isArray(r.data) ? r.data : []),
    refetchInterval: 60_000,
    retry: false,
  });

  const unread = notifications.filter((n: Record<string, unknown>) => !n.read).length;

  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.put("/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const typeLabels: Record<string, string> = {
    review_ready: "Review",
    goal_reminder: "Goal",
    relationship_check: "Social",
    coach_insight: "Coach",
    nudge: "Nudge",
    life_inbox: "Inbox",
    evening_reflection: "Reflect",
    medication_reminder: "Health",
    system: "System",
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(s => !s)}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl panel transition hover:bg-white"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-slate-700" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-[21.5rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl panel">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-bold text-slate-950">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs font-bold text-primary"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">All caught up</div>
              ) : (
                notifications.map((n: Record<string, unknown>) => (
                  <div
                    key={n.id as string}
                    onClick={() => {
                      if (!n.read) markRead.mutate(n.id as string);
                      setOpen(false);
                    }}
                    className={`cursor-pointer border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50 ${
                      !n.read ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                        {typeLabels[n.type as string] || "Alert"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`line-clamp-1 text-sm ${!n.read ? "font-bold text-slate-950" : "text-slate-700"}`}>
                          {n.title as string}
                        </p>
                        {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body as string}</p> : null}
                        <p className="mt-1 text-xs text-slate-400">
                          {format(parseISO(n.created_at as string), "MMM d, h:mm a")}
                        </p>
                      </div>
                      {!n.read ? <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" /> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
