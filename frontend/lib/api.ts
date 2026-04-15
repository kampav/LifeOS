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

// Global error handler — no redirects here, let components handle auth state
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
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
  getConversation: (id: string) => api.get(`/ai/conversations/${id}`),
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

export const notificationsApi = {
  list: () => api.get("/notifications"),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  getPreferences: () => api.get("/notifications/preferences"),
  updatePreferences: (data: Record<string, unknown>) => api.post("/notifications/preferences", data),
};

export const personalisationApi = {
  get: () => api.get("/users/me/personalisation"),
  patch: (data: Record<string, unknown>) => api.patch("/users/me/personalisation", data),
  reset: () => api.post("/users/me/personalisation/reset"),
  learning: () => api.get("/users/me/personalisation/learning"),
  undo: () => api.post("/users/me/personalisation/undo"),
};

export const mcpApi = {
  tokens: () => api.get("/mcp/tokens"),
  createToken: (data: { name: string; scopes?: string[] }) => api.post("/mcp/tokens", data),
  deleteToken: (id: string) => api.delete(`/mcp/tokens/${id}`),
  tools: () => api.get("/mcp/tools"),
  serverConfig: () => api.get("/mcp/server-config"),
};

export const tasksApi = {
  kanban: (params?: Record<string, string>) => api.get("/kanban", { params }),
  create: (data: Record<string, unknown>) => api.post("/tasks", data),
  get: (id: string) => api.get(`/tasks/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  move: (id: string, status: string, position?: number) => api.post(`/tasks/${id}/move`, { status, position }),
  bulk: (action: string, ids: string[], payload?: Record<string, unknown>) =>
    api.post("/tasks/bulk", { action, ids, payload }),
};

export const plannerApi = {
  list: (params?: Record<string, string>) => api.get("/planner", { params }),
  priority: () => api.get("/planner/priority"),
  agenda: (days?: number) => api.get(`/planner/agenda${days ? `?days=${days}` : ""}`),
  createItem: (data: Record<string, unknown>) => api.post("/planner/items", data),
  updateItem: (id: string, data: Record<string, unknown>) => api.put(`/planner/items/${id}`, data),
  deleteItem: (id: string) => api.delete(`/planner/items/${id}`),
  completeItem: (id: string) => api.post(`/planner/items/${id}/complete`),
  syncGoogle: () => api.post("/planner/sync/google"),
};

export const homescreenApi = {
  get: () => api.get("/homescreen"),
  refresh: () => api.post("/homescreen/refresh"),
  completeItem: (id: string) => api.post(`/homescreen/items/${id}/complete`),
  snoozeItem: (id: string, hours?: number) => api.post(`/homescreen/items/${id}/snooze`, { hours }),
};

export const importantDatesApi = {
  list: (params?: { domain?: string; category?: string }) => api.get("/important-dates", { params }),
  upcoming: (days?: number, domain?: string) => api.get("/important-dates/upcoming", { params: { days, domain } }),
  create: (data: Record<string, unknown>) => api.post("/important-dates", data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/important-dates/${id}`, data),
  delete: (id: string) => api.delete(`/important-dates/${id}`),
};

export const assetsApi = {
  list: () => api.get("/assets"),
  summary: () => api.get("/assets/summary"),
  create: (data: Record<string, unknown>) => api.post("/assets", data),
  get: (id: string) => api.get(`/assets/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.put(`/assets/${id}`, data),
  delete: (id: string) => api.delete(`/assets/${id}`),
};

export const vaultApi = {
  listDocuments: () => api.get("/vault/documents"),
  createDocument: (data: Record<string, unknown>) => api.post("/vault/documents", data),
  deleteDocument: (id: string) => api.delete(`/vault/documents/${id}`),
  listLegacy: () => api.get("/vault/legacy"),
  getLegacy: (id: string) => api.get(`/vault/legacy/${id}`),
  createLegacy: (data: Record<string, unknown>) => api.post("/vault/legacy", data),
  updateLegacy: (id: string, data: Record<string, unknown>) => api.put(`/vault/legacy/${id}`, data),
  deleteLegacy: (id: string) => api.delete(`/vault/legacy/${id}`),
};

export const privacyApi = {
  myConsents: () => api.get("/privacy/my-consents"),
  grant: (consentType: string) => api.post("/privacy/grant", { consent_type: consentType }),
  withdraw: (consentType: string) => api.post(`/privacy/withdraw/${consentType}`),
  export: () => api.post("/privacy/export"),
  portability: () => api.post("/privacy/portability"),
  delete: () => api.post("/privacy/delete", { confirm: true }),
};

export const documentsApi = {
  upload: (files: File[]) => {
    const form = new FormData();
    files.forEach(f => form.append("files", f));
    return api.post("/coach/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  status: (id: string) => api.get(`/coach/upload/${id}/status`),
  confirm: (id: string, confirmedItems: { title: string; domain: string; item_type: string }[]) =>
    api.post(`/coach/upload/${id}/confirm`, { confirmed_items: confirmedItems }),
  skip: (id: string, reason?: string) => api.post(`/coach/upload/${id}/skip`, { reason }),
  list: () => api.get("/coach/uploads"),
};
