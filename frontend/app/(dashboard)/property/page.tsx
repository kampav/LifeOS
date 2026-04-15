"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assetsApi, vaultApi, goalsApi } from "@/lib/api";
import { Home, Plus, TrendingUp, Shield, FileText, Trash2, ChevronDown, ChevronUp } from "lucide-react";

type Asset = { id: string; name: string; asset_type: string; current_value?: number; liability?: number; notes?: string };
type VaultDoc = { id: string; title: string; document_type: string; expiry_date?: string; expiring_soon?: boolean; days_until_expiry?: number };

const ASSET_TYPES = ["property","vehicle","investment","pension","savings","business","insurance","crypto","other"];
const PROPERTY_DOC_TYPES = ["property_deed","insurance_policy","will","power_of_attorney","tax_document","other"];
const TYPE_COLOR: Record<string, string> = {
  property: "#6366f1", investment: "#10b981", pension: "#f59e0b",
  savings: "#3b82f6", vehicle: "#8b5cf6", business: "#ec4899",
  insurance: "#14b8a6", crypto: "#f97316", other: "#94a3b8",
};

export default function PropertyPage() {
  const qc = useQueryClient();
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState({ name: "", asset_type: "property", current_value: "", liability: "", notes: "" });
  const [docForm, setDocForm] = useState({ title: "", document_type: "property_deed", expiry_date: "" });

  const { data: assetsData } = useQuery({ queryKey: ["assets"], queryFn: () => assetsApi.list().then(r => r.data), staleTime: 120_000 });
  const { data: docsData } = useQuery({ queryKey: ["vault-docs"], queryFn: () => vaultApi.listDocuments().then(r => r.data), staleTime: 120_000 });
  const { data: goalsData = [] } = useQuery({ queryKey: ["goals", "property"], queryFn: () => goalsApi.list({ domain: "property" }).then(r => Array.isArray(r.data) ? r.data : []), staleTime: 120_000 });

  const createAsset = useMutation({
    mutationFn: () => assetsApi.create({ ...assetForm, current_value: assetForm.current_value ? parseFloat(assetForm.current_value) : undefined, liability: parseFloat(assetForm.liability) || 0 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assets"] }); setShowAddAsset(false); setAssetForm({ name: "", asset_type: "property", current_value: "", liability: "", notes: "" }); },
  });
  const deleteAsset = useMutation({ mutationFn: (id: string) => assetsApi.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }) });
  const createDoc = useMutation({
    mutationFn: () => vaultApi.createDocument({ ...docForm, expiry_date: docForm.expiry_date || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vault-docs"] }); setShowAddDoc(false); setDocForm({ title: "", document_type: "property_deed", expiry_date: "" }); },
  });
  const deleteDoc = useMutation({ mutationFn: (id: string) => vaultApi.deleteDocument(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["vault-docs"] }) });

  const assets = (assetsData?.assets as Asset[]) || [];
  const docs = (docsData?.documents as VaultDoc[]) || [];
  const goals = goalsData as { id: string; title: string; status: string; current_value?: number; target_value?: number }[];
  const totalValue = (assetsData?.total_value as number) || 0;
  const totalLiability = (assetsData?.total_liability as number) || 0;
  const netEquity = (assetsData?.net_equity as number) || 0;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center"><Home className="w-5 h-5 text-indigo-600" /></div>
          <h1 className="text-2xl font-bold text-gray-900">Property & Assets</h1>
        </div>
        <button onClick={() => setShowAddAsset(s => !s)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
          <Plus className="w-4 h-4" /> Add Asset
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-card"><p className="text-xs text-gray-500 mb-1">Total Assets</p><p className="text-xl font-bold text-indigo-600">£{totalValue.toLocaleString()}</p></div>
        <div className="bg-white rounded-2xl p-5 shadow-card"><p className="text-xs text-gray-500 mb-1">Liabilities</p><p className="text-xl font-bold text-red-500">£{totalLiability.toLocaleString()}</p></div>
        <div className="bg-white rounded-2xl p-5 shadow-card"><p className="text-xs text-gray-500 mb-1">Net Equity</p><p className={`text-xl font-bold ${netEquity >= 0 ? "text-green-600" : "text-red-500"}`}>£{netEquity.toLocaleString()}</p></div>
      </div>

      {showAddAsset && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">New Asset</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Asset name" value={assetForm.name} onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2" />
            <select value={assetForm.asset_type} onChange={e => setAssetForm(f => ({ ...f, asset_type: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {ASSET_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <input type="number" placeholder="Current value (£)" value={assetForm.current_value} onChange={e => setAssetForm(f => ({ ...f, current_value: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <input type="number" placeholder="Liability / mortgage (£)" value={assetForm.liability} onChange={e => setAssetForm(f => ({ ...f, liability: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <input placeholder="Notes (optional)" value={assetForm.notes} onChange={e => setAssetForm(f => ({ ...f, notes: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => createAsset.mutate()} disabled={!assetForm.name || createAsset.isPending} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-indigo-700 transition">{createAsset.isPending ? "Saving…" : "Save"}</button>
            <button onClick={() => setShowAddAsset(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> Assets ({assets.length})</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {assets.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No assets recorded yet.</p>
          : assets.map(a => (
            <div key={a.id}>
              <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition cursor-pointer" onClick={() => setExpandedAsset(expandedAsset === a.id ? null : a.id)}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: TYPE_COLOR[a.asset_type] || "#94a3b8" }} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{a.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{a.asset_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">£{(a.current_value || 0).toLocaleString()}</p>
                  {(a.liability || 0) > 0 && <p className="text-xs text-red-400">-£{(a.liability || 0).toLocaleString()}</p>}
                </div>
                {expandedAsset === a.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
              {expandedAsset === a.id && (
                <div className="px-5 pb-4 bg-gray-50 space-y-2">
                  {a.notes && <p className="text-xs text-gray-500">{a.notes}</p>}
                  <p className="text-xs text-green-600 font-medium">Net equity: £{((a.current_value || 0) - (a.liability || 0)).toLocaleString()}</p>
                  <button onClick={() => deleteAsset.mutate(a.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {goals.filter(g => g.status === "active").length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Property Goals</h2>
          <div className="space-y-3">
            {goals.filter(g => g.status === "active").map(g => {
              const pct = g.target_value ? Math.min(100, ((g.current_value || 0) / g.target_value) * 100) : 0;
              return (
                <div key={g.id}>
                  <div className="flex justify-between mb-1"><span className="text-sm text-gray-700">{g.title}</span><span className="text-xs text-gray-400">{Math.round(pct)}%</span></div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-2 bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-500" /> Document Vault</h2>
          <button onClick={() => setShowAddDoc(s => !s)} className="flex items-center gap-1 text-xs text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition"><Plus className="w-3.5 h-3.5" /> Add</button>
        </div>
        {showAddDoc && (
          <div className="px-5 py-4 border-b border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Document title" value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm col-span-2" />
              <select value={docForm.document_type} onChange={e => setDocForm(f => ({ ...f, document_type: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
                {PROPERTY_DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
              <input type="date" value={docForm.expiry_date} onChange={e => setDocForm(f => ({ ...f, expiry_date: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => createDoc.mutate()} disabled={!docForm.title || createDoc.isPending} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-indigo-700 transition">{createDoc.isPending ? "Saving…" : "Save"}</button>
              <button onClick={() => setShowAddDoc(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
            </div>
          </div>
        )}
        <div className="divide-y divide-gray-50">
          {docs.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No documents stored yet.</p>
          : docs.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-5 py-3">
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{d.title}</p>
                <p className="text-xs text-gray-400 capitalize">{d.document_type.replace(/_/g, " ")}{d.expiry_date ? ` · Expires ${d.expiry_date}` : ""}</p>
              </div>
              {d.expiring_soon && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{d.days_until_expiry}d left</span>}
              <button onClick={() => deleteDoc.mutate(d.id)} className="text-gray-300 hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
