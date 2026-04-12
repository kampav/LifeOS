"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
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
    mutationFn: async () => {
      await Promise.all(
        notifications.filter((n: Record<string, unknown>) => !n.read).map((n: Record<string, unknown>) => api.put(`/notifications/${n.id}/read`))
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const TYPE_ICONS: Record<string, string> = {
    review_ready: "📊", goal_reminder: "🎯", relationship_check: "👥",
    coach_insight: "✨", system: "🔔",
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(s => !s)}
        className="relative w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
        <Bell className="w-4 h-4 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                {unread > 0 && (
                  <button onClick={() => markAllRead.mutate()}
                    className="text-xs text-primary font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm">All caught up!</div>
                ) : (
                  notifications.map((n: Record<string, unknown>) => (
                    <div key={n.id as string}
                      onClick={() => { if (!n.read) markRead.mutate(n.id as string); setOpen(false); }}
                      className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? "bg-indigo-50/50" : ""}`}
                    >
                      <div className="flex gap-3 items-start">
                        <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type as string] || "🔔"}</span>
                        <div className="min-w-0">
                          <p className={`text-sm ${!n.read ? "font-semibold text-gray-900" : "text-gray-700"} line-clamp-1`}>{n.title as string}</p>
                          {n.body ? <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body as string}</p> : null}
                          <p className="text-xs text-gray-400 mt-1">{format(parseISO(n.created_at as string), "MMM d, h:mm a")}</p>
                        </div>
                        {!n.read ? <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" /> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
