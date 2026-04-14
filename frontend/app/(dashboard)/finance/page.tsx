"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, AlertTriangle, Plus, Calendar } from "lucide-react";

const SpendBarChart = dynamic(
  () => import("@/components/life-os/FinanceCharts").then(m => m.SpendBarChart),
  { ssr: false, loading: () => <div className="h-56 bg-gray-50 animate-pulse rounded-xl" /> }
);
const NetWorthLineChart = dynamic(
  () => import("@/components/life-os/FinanceCharts").then(m => m.NetWorthLineChart),
  { ssr: false, loading: () => <div className="h-44 bg-gray-50 animate-pulse rounded-xl" /> }
);

const SPEND_CATEGORIES = ["housing","transport","food_drink","entertainment","health","clothing","utilities","insurance","savings_investment","other"];

export default function FinancePage() {
  const qc = useQueryClient();
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [txnForm, setTxnForm] = useState({
    amount: "", category: "food_drink", direction: "expense",
    description: "", date: new Date().toISOString().slice(0, 10),
  });

  const { data: spending } = useQuery({ queryKey: ["finance-spending"], queryFn: () => api.get("/finance/spending?months=3").then(r => r.data), staleTime: 300_000 });
  const { data: budget } = useQuery({ queryKey: ["finance-budget"], queryFn: () => api.get("/finance/budget").then(r => r.data), staleTime: 300_000 });
  const { data: netWorth } = useQuery({ queryKey: ["finance-net-worth"], queryFn: () => api.get("/finance/net-worth?months=12").then(r => r.data), staleTime: 300_000 });
  const { data: tax } = useQuery({ queryKey: ["finance-tax"], queryFn: () => api.get("/finance/tax").then(r => r.data), staleTime: 3_600_000 });

  const addTxn = useMutation({
    mutationFn: (d: typeof txnForm) => api.post("/finance/transactions", { ...d, amount: parseFloat(d.amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-spending"] });
      qc.invalidateQueries({ queryKey: ["finance-budget"] });
      setShowAddTxn(false);
    },
  });

  const spendData = ((spending?.breakdown as { category: string; amount: number; pct: number }[]) || []).slice(0, 8);
  const budgetRows = (budget?.budget_vs_actuals as { category: string; budgeted: number; actual: number; over_budget: boolean }[]) || [];
  const nwSnapshots = (netWorth?.snapshots as { snapshot_date: string; net_worth: number }[]) || [];
  const nwLatest = netWorth?.latest as { net_worth: number; assets: number; liabilities: number } | undefined;
  const taxDeadlines = (tax?.hmrc_deadlines as { event: string; date: string }[]) || [];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <button onClick={() => setShowAddTxn(s => !s)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
          <Plus className="w-4 h-4" /> Log Transaction
        </button>
      </div>

      {showAddTxn && (
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">New Transaction</h2>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Amount (£)" value={txnForm.amount}
              onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <input type="date" value={txnForm.date}
              onChange={e => setTxnForm(f => ({ ...f, date: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <select value={txnForm.direction} onChange={e => setTxnForm(f => ({ ...f, direction: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select value={txnForm.category} onChange={e => setTxnForm(f => ({ ...f, category: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {SPEND_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <input placeholder="Description (optional)" value={txnForm.description}
            onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={() => addTxn.mutate(txnForm)} disabled={!txnForm.amount || addTxn.isPending}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition">
              {addTxn.isPending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setShowAddTxn(false)} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition">Cancel</button>
          </div>
        </div>
      )}

      {nwLatest && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <p className="text-xs text-gray-500 mb-1">Net Worth</p>
            <p className="text-xl font-bold text-indigo-600">£{Number(nwLatest.net_worth).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-card flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <div><p className="text-xs text-gray-500">Assets</p><p className="text-lg font-bold text-green-600">£{Number(nwLatest.assets).toLocaleString()}</p></div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-card flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <div><p className="text-xs text-gray-500">Liabilities</p><p className="text-lg font-bold text-red-500">£{Number(nwLatest.liabilities).toLocaleString()}</p></div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Spending — Last 3 Months</h2>
          {spendData.length > 0 ? <SpendBarChart data={spendData} /> : <p className="text-sm text-gray-400 py-8 text-center">No transactions yet.</p>}
          <p className="text-xs text-gray-400 mt-2">Total: £{(spending?.total_spend as number | undefined)?.toFixed(2) ?? "—"}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Net Worth Trend</h2>
          {nwSnapshots.length > 1 ? <NetWorthLineChart data={nwSnapshots} /> : <p className="text-sm text-gray-400 py-8 text-center">Add monthly snapshots to see your trend.</p>}
        </div>
      </div>

      {budgetRows.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Budget vs Actuals — This Month</h2>
          <div className="space-y-3">
            {budgetRows.map(row => (
              <div key={row.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 capitalize">{row.category.replace(/_/g, " ")}</span>
                  <span className={`text-xs font-medium ${row.over_budget ? "text-red-500" : "text-green-600"}`}>
                    £{row.actual.toFixed(0)} / £{row.budgeted.toFixed(0)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-2 rounded-full ${row.over_budget ? "bg-red-400" : "bg-indigo-400"}`}
                    style={{ width: `${Math.min(100, row.budgeted ? (row.actual / row.budgeted) * 100 : 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {taxDeadlines.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" /> HMRC Deadlines
          </h2>
          {taxDeadlines.map((d, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-800">{d.event}</span>
              <span className="text-xs font-medium text-amber-600">{d.date}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>Life OS provides financial information for educational purposes only. This is not regulated financial advice. Consult a qualified financial adviser before making investment or significant financial decisions.</p>
      </div>
    </div>
  );
}
