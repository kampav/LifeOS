import axios, { AxiosError } from "axios";
import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Global error handler
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Only redirect if we're not already on an auth page
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Typed helpers ────────────────────────────────────────────────────────────
export const entriesApi = {
  create: (data: Record<string, unknown>) => api.post("/entries", data),
  list: (params?: Record<string, unknown>) => api.get("/entries", { params }),
  delete: (id: string) => api.delete(`/entries/${id}`),
};

export const goalsApi = {
  create: (data: Record<string, unknown>) => api.post("/goals", data),
  list: (params?: Record<string, unknown>) => api.get("/goals", { params }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/goals/${id}`, data),
  progress: (id: string, value: number) => api.post(`/goals/${id}/progress`, { current_value: value }),
};

export const habitsApi = {
  create: (data: Record<string, unknown>) => api.post("/habits", data),
  list: () => api.get("/habits"),
  log: (id: string, completed: boolean, notes?: string) => api.post(`/habits/${id}/log`, { completed, notes }),
  history: (id: string, days = 90) => api.get(`/habits/${id}/history?days=${days}`),
};

export const aiApi = {
  chat: (message: string, domain?: string, conversationId?: string) =>
    api.post("/ai/chat", { message, domain, conversation_id: conversationId }),
  conversations: () => api.get("/ai/conversations"),
  dailyBrief: () => api.get("/ai/daily-brief"),
  weeklyReview: () => api.post("/ai/weekly-review"),
  memory: () => api.get("/ai/memory"),
  deleteMemory: (id: string) => api.delete(`/ai/memory/${id}`),
};

export const domainsApi = {
  dashboard: (domain: string) => api.get(`/domains/${domain}/dashboard`),
  score: (domain: string) => api.get(`/domains/${domain}/score`),
  insights: (domain: string) => api.get(`/domains/${domain}/insights`),
};

export const socialApi = {
  contacts: (params?: Record<string, unknown>) => api.get("/social/contacts", { params }),
  createContact: (data: Record<string, unknown>) => api.post("/social/contacts", data),
  updateContact: (id: string, data: Record<string, unknown>) => api.put(`/social/contacts/${id}`, data),
  logInteraction: (id: string, notes?: string) => api.post(`/social/contacts/${id}/interaction`, { notes }),
  dueCheckins: () => api.get("/social/contacts/due-checkin"),
};

export const usersApi = {
  me: () => api.get("/users/me"),
  score: () => api.get("/users/me/score"),
  update: (data: Record<string, unknown>) => api.put("/users/me", data),
  onboarding: (data: Record<string, unknown>) => api.post("/users/onboarding", data),
};
