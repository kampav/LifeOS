"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Shield, Download, Trash2, AlertTriangle, CheckCircle, Lock } from "lucide-react";

const REQUIRED_CONSENTS = ["health_data", "financial_data", "ai_processing"] as const;
const OPTIONAL_CONSENTS = ["marketing", "analytics", "third_party_sharing"] as const;

const CONSENT_META: Record<string, { label: string; desc: string }> = {
  health_data: { label: "Health Data Processing", desc: "Required to store and analyse health appointments, medications, and screenings." },
  financial_data: { label: "Financial Data Processing", desc: "Required to store and analyse transactions, budgets, and net worth." },
  ai_processing: { label: "AI Coaching", desc: "Required to provide personalised AI coaching and insights across all domains." },
  marketing: { label: "Marketing Communications", desc: "Occasional product updates and feature announcements." },
  analytics: { label: "Usage Analytics", desc: "Aggregate usage patterns to improve the product." },
  third_party_sharing: { label: "Third-Party Integrations", desc: "Share data with connected services (Google, etc.) when you trigger a sync." },
};

export default function PrivacyPage() {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [deleteDone, setDeleteDone] = useState(false);

  const { data: consentsData } = useQuery({
    queryKey: ["privacy-consents"],
    queryFn: () => api.get("/privacy/my-consents").then(r => r.data),
    staleTime: 60_000,
  });

  const consents: Record<string, boolean> = consentsData?.consents || {};

  const withdrawConsent = useMutation({
    mutationFn: (type: string) => api.post(`/privacy/withdraw/${type}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["privacy-consents"] }),
  });

  const grantConsent = useMutation({
    mutationFn: (type: string) => api.post("/privacy/grant", { consent_type: type }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["privacy-consents"] }),
  });

  const exportData = useMutation({
    mutationFn: () => api.post("/privacy/export"),
    onSuccess: () => setExportDone(true),
  });

  const deleteAccount = useMutation({
    mutationFn: () => api.post("/privacy/delete", { confirm: true }),
    onSuccess: () => setDeleteDone(true),
  });

  function toggleConsent(type: string, isRequired: boolean) {
    if (isRequired) return; // never allow withdrawal of required consents
    if (consents[type]) {
      withdrawConsent.mutate(type);
    } else {
      grantConsent.mutate(type);
    }
  }

  if (deleteDone) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
          <Trash2 className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Deletion Scheduled</h2>
        <p className="text-gray-500 text-sm">Your account and all data will be permanently deleted within 30 days as required by UK GDPR Article 17.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-indigo-500" />
        <h1 className="text-2xl font-bold text-gray-900">Privacy & Data</h1>
      </div>

      {/* Required consents */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Required Consents</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">These are required for Life OS to function. Withdrawing them will disable core features.</p>
        <div className="space-y-3">
          {REQUIRED_CONSENTS.map(type => {
            const meta = CONSENT_META[type];
            return (
              <div key={type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 mr-4">
                  <p className="text-sm font-medium text-gray-800">{meta.label}</p>
                  <p className="text-xs text-gray-400">{meta.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Required</span>
                  <div className="w-10 h-5 bg-indigo-500 rounded-full relative opacity-70 cursor-not-allowed">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional consents */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Optional Consents</h2>
        <p className="text-xs text-gray-400 mb-4">You can withdraw these at any time without affecting core functionality.</p>
        <div className="space-y-3">
          {OPTIONAL_CONSENTS.map(type => {
            const meta = CONSENT_META[type];
            const granted = consents[type] ?? false;
            return (
              <div key={type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 mr-4">
                  <p className="text-sm font-medium text-gray-800">{meta.label}</p>
                  <p className="text-xs text-gray-400">{meta.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={granted}
                    onChange={() => toggleConsent(type, false)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:bg-indigo-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data export */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Data Export</h2>
        <p className="text-sm text-gray-500 mb-4">Download a complete copy of your Life OS data in JSON format. The download link will be sent to your email.</p>
        {exportDone ? (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            Export requested — you'll receive an email with your download link.
          </div>
        ) : (
          <button
            onClick={() => exportData.mutate()}
            disabled={exportData.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition">
            <Download className="w-4 h-4" />
            {exportData.isPending ? "Requesting…" : "Request Data Export"}
          </button>
        )}
      </div>

      {/* Delete account */}
      <div className="bg-white rounded-2xl shadow-card p-5 border border-red-100">
        <h2 className="font-semibold text-red-700 mb-1">Delete Account</h2>
        <p className="text-sm text-gray-500 mb-4">Permanently delete your account and all associated data. This will be completed within 30 days as required by UK GDPR Article 17. This action cannot be undone.</p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 text-sm rounded-xl hover:bg-red-50 transition">
            <Trash2 className="w-4 h-4" />
            Delete My Account
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Are you absolutely sure? All your data — entries, goals, habits, health records, financial records, and AI memory — will be permanently deleted within 30 days.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => deleteAccount.mutate()}
                disabled={deleteAccount.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700 disabled:opacity-40 transition">
                {deleteAccount.isPending ? "Scheduling…" : "Yes, Delete Everything"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center pb-4">
        Life OS complies with UK GDPR. For data requests or concerns, contact privacy@lifeos.app
      </p>
    </div>
  );
}
