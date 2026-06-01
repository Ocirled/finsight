"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { BudgetModal } from "@/components/forms/BudgetModal";
import { EXPENSE_CATEGORIES } from "@/types";

interface Budget {
  id: string;
  category: string;
  limitAmount: number;
  spent: number;
  remaining: number;
  percentage: number;
  month: number;
  year: number;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #dad4c8",
  borderRadius: "16px",
  boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px",
};

function progressColor(pct: number): string {
  if (pct >= 100) return "bg-[#fc7981]";
  if (pct >= 80) return "bg-[#fbbd41]";
  return "bg-[#078a52]";
}

function textColor(pct: number): string {
  if (pct >= 100) return "#c0393f";
  if (pct >= 80) return "#d08a11";
  return "#9f9b93";
}

interface BudgetTransaction {
  id: string;
  description: string;
  merchant: string | null;
  amount: number;
  date: string;
}

function BudgetRow({
  budget,
  month,
  year,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  month: number;
  year: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [transactions, setTransactions] = useState<BudgetTransaction[] | null>(null);

  async function loadTransactions() {
    if (transactions !== null) return;
    setTxLoading(true);
    const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const dateTo = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const res = await fetch(
      `/api/transactions?category=${encodeURIComponent(budget.category)}&type=EXPENSE&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=100`
    );
    if (res.ok) {
      const data = await res.json();
      const txs: BudgetTransaction[] = (data.transactions ?? []).map(
        (t: { id: string; description: string; merchant: string | null; amount: number; date: string }) => ({
          id: t.id,
          description: t.description,
          merchant: t.merchant,
          amount: Number(t.amount),
          date: t.date,
        })
      );
      txs.sort((a, b) => b.amount - a.amount);
      setTransactions(txs);
    }
    setTxLoading(false);
  }

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) loadTransactions();
  }

  const avgAmount =
    transactions && transactions.length >= 2
      ? transactions.reduce((s, t) => s + t.amount, 0) / transactions.length
      : null;
  const threshold = avgAmount ? avgAmount * 1.5 : null;

  return (
    <div style={cardStyle} className="overflow-hidden">
      {/* Clickable header */}
      <div
        onClick={handleToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleToggle(); } }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        className="w-full text-left p-4 space-y-3 transition-colors cursor-pointer hover:bg-[#faf9f7]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {budget.percentage >= 100 && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(252,121,129,0.15)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c0393f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
            )}
            {budget.percentage >= 80 && budget.percentage < 100 && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(251,189,65,0.15)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d08a11" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
            )}
            <span className="text-sm font-medium truncate" style={{ color: "#000000" }}>{budget.category}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold tabular-nums" style={{ color: textColor(budget.percentage) }}>
              {budget.percentage}%
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[#eee9df]"
              style={{ color: "#9f9b93" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            {confirmDelete ? (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="px-2 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  style={{ background: "rgba(252,121,129,0.1)", color: "#c0393f" }}
                >
                  Hapus?
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-xs hover:bg-[#eee9df]"
                  style={{ color: "#9f9b93" }}
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[#fc7981]/10 hover:text-[#c0393f]"
                style={{ color: "#9f9b93" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg" width="13" height="13"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className={`shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              style={{ color: "#9f9b93" }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#eee9df" }}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor(budget.percentage)}`}
            style={{ width: `${Math.min(budget.percentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs tabular-nums">
          <span style={{ color: textColor(budget.percentage) }}>
            {formatCurrency(budget.spent)} terpakai
          </span>
          <span style={{ color: "#9f9b93" }}>dari {formatCurrency(budget.limitAmount)}</span>
        </div>

        {budget.percentage >= 100 && (
          <div className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5" style={{ color: "#c0393f", background: "rgba(252,121,129,0.08)", border: "1px solid rgba(252,121,129,0.15)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Melebihi batas {formatCurrency(budget.spent - budget.limitAmount)}
          </div>
        )}
        {budget.percentage >= 80 && budget.percentage < 100 && (
          <div className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5" style={{ color: "#d08a11", background: "rgba(251,189,65,0.08)", border: "1px solid rgba(251,189,65,0.15)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Mendekati batas — sisa {formatCurrency(budget.remaining)}
          </div>
        )}
      </div>

      {/* Transaction detail */}
      {expanded && (
        <div style={{ borderTop: "1px solid #dad4c8" }}>
          {txLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#078a52", borderTopColor: "transparent" }} />
            </div>
          )}

          {!txLoading && transactions?.length === 0 && (
            <p className="text-xs text-center py-5" style={{ color: "#9f9b93" }}>
              Tidak ada transaksi tercatat di kategori ini bulan ini
            </p>
          )}

          {!txLoading && transactions && transactions.length > 0 && (
            <>
              {avgAmount !== null && (
                <div className="px-4 py-2 flex items-center justify-between" style={{ background: "#faf9f7" }}>
                  <span className="text-xs" style={{ color: "#9f9b93" }}>
                    {transactions.length} transaksi · Rata-rata {formatCurrency(Math.round(avgAmount))}
                  </span>
                  <span className="text-xs" style={{ color: "#d08a11" }}>
                    ⚠ di atas rata-rata ×1.5
                  </span>
                </div>
              )}
              <ul>
                {transactions.map((tx) => {
                  const isUnusual = threshold !== null && tx.amount >= threshold;
                  return (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between px-4 py-3 gap-3"
                      style={{
                        borderTop: "1px solid rgba(218,212,200,0.6)",
                        background: isUnusual ? "rgba(251,189,65,0.05)" : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs tabular-nums whitespace-nowrap shrink-0" style={{ color: "#9f9b93" }}>
                          {formatShortDate(tx.date)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs truncate" style={{ color: "#55534e" }}>{tx.description}</p>
                          {tx.merchant && (
                            <p className="text-xs truncate" style={{ color: "#9f9b93" }}>{tx.merchant}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isUnusual && (
                          <span className="text-xs px-1.5 py-0.5 rounded whitespace-nowrap" style={{ background: "rgba(251,189,65,0.12)", color: "#d08a11", border: "1px solid rgba(251,189,65,0.2)" }}>
                            Tidak wajar
                          </span>
                        )}
                        <span className="text-xs font-semibold tabular-nums" style={{ color: "#c0393f" }}>
                          -{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function BudgetPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, number> | null>(null);
  const [aiError, setAiError] = useState("");

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/budgets?month=${month}&year=${year}`);
    if (res.ok) {
      const data = await res.json();
      setBudgets(data.budgets ?? []);
    }
    setLoading(false);
  }, [month, year]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  async function handleDelete(id: string) {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
  }

  async function handleGetAiSuggestions() {
    setAiLoading(true);
    setAiError("");
    setAiSuggestions(null);
    try {
      const res = await fetch(`/api/budgets/suggest?month=${month}&year=${year}`);
      const data = await res.json();
      if (res.ok && Object.keys(data.suggestions).length > 0) {
        setAiSuggestions(data.suggestions);
      } else if (data.message) {
        setAiError(data.message);
      } else {
        setAiError("Tidak dapat membuat saran. Coba lagi nanti.");
      }
    } catch {
      setAiError("Terjadi kesalahan jaringan");
    }
    setAiLoading(false);
  }

  async function applyAiSuggestion(category: string, amount: number) {
    const existing = budgets.find((b) => b.category === category);
    if (existing) return;
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, limitAmount: amount, month, year }),
    });
    if (res.ok) fetchBudgets();
  }

  const existingCategories = budgets.map((b) => b.category);
  const totalLimit = budgets.reduce((s, b) => s + b.limitAmount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overallPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const alertCount = budgets.filter((b) => b.percentage >= 80).length;

  const unbudgetedSuggestions = aiSuggestions
    ? Object.entries(aiSuggestions).filter(([cat]) =>
        EXPENSE_CATEGORIES.includes(cat as typeof EXPENSE_CATEGORIES[number]) &&
        !existingCategories.includes(cat)
      )
    : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#000000" }}>Anggaran</h1>
          <p className="text-sm mt-0.5" style={{ color: "#9f9b93" }}>Pantau batas pengeluaran per kategori</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Month nav */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "#ffffff", border: "1px solid #dad4c8" }}>
            <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-[#eee9df]" style={{ color: "#9f9b93" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span className="text-sm font-medium px-2 min-w-28 text-center" style={{ color: "#000000" }}>
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-[#eee9df]" style={{ color: "#9f9b93" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <button
            onClick={handleGetAiSuggestions}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50 hover:bg-[#eee9df]"
            style={{ background: "#ffffff", border: "1px solid #dad4c8", color: "#55534e" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
            {aiLoading ? "Menganalisis..." : "Saran AI"}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="clay-btn desktop-btn items-center gap-1.5 px-3.5 py-2 text-white rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: "#078a52" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Anggaran
          </button>
        </div>
      </div>

      {/* Summary */}
      {!loading && budgets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div style={cardStyle} className="p-3 sm:p-4">
            <p className="text-xs mb-1" style={{ color: "#9f9b93" }}>Kategori</p>
            <p className="text-lg sm:text-xl font-semibold" style={{ color: "#000000" }}>{budgets.length}</p>
          </div>
          <div style={cardStyle} className="p-3 sm:p-4">
            <p className="text-xs mb-1" style={{ color: "#9f9b93" }}>Total Anggaran</p>
            <p className="text-lg sm:text-xl font-semibold tabular-nums" style={{ color: "#000000" }}>{formatCurrency(totalLimit)}</p>
          </div>
          <div style={cardStyle} className="p-3 sm:p-4">
            <p className="text-xs mb-1" style={{ color: "#9f9b93" }}>Terpakai</p>
            <p className="text-lg sm:text-xl font-semibold tabular-nums" style={{ color: textColor(overallPct) }}>
              {formatCurrency(totalSpent)}
            </p>
          </div>
          <div style={cardStyle} className="p-3 sm:p-4">
            <p className="text-xs mb-1" style={{ color: "#9f9b93" }}>Penggunaan</p>
            <p className="text-lg sm:text-xl font-semibold tabular-nums" style={{ color: textColor(overallPct) }}>
              {overallPct}%
            </p>
            {alertCount > 0 && (
              <p className="text-xs mt-0.5" style={{ color: "#d08a11" }}>{alertCount} perlu perhatian</p>
            )}
          </div>
        </div>
      )}

      {/* AI error */}
      {aiError && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: "rgba(252,121,129,0.08)", border: "1px solid rgba(252,121,129,0.2)", color: "#c0393f" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="flex-1">{aiError}</span>
          <button
            onClick={() => setAiError("")}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-[#fc7981]/20 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* AI suggestions panel */}
      {aiSuggestions && unbudgetedSuggestions.length > 0 && (
        <div style={{ ...cardStyle, border: "1px solid rgba(67,8,159,0.15)" }} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(67,8,159,0.08)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#43089f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
            </div>
            <h3 className="text-sm font-medium" style={{ color: "#000000" }}>Saran AI — berdasarkan historis 3 bulan terakhir</h3>
            <button
              onClick={() => setAiSuggestions(null)}
              className="ml-auto transition-colors cursor-pointer hover:text-[#55534e]"
              style={{ color: "#9f9b93" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {unbudgetedSuggestions.map(([category, amount]) => (
              <div key={category} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: "#faf9f7", border: "1px solid #dad4c8" }}>
                <div>
                  <span className="text-sm" style={{ color: "#000000" }}>{category}</span>
                  <span className="text-xs ml-2" style={{ color: "#9f9b93" }}>Saran batas: {formatCurrency(amount)}</span>
                </div>
                <button
                  onClick={() => applyAiSuggestion(category, amount)}
                  className="clay-btn text-xs px-3 py-1.5 text-white rounded-md transition-colors cursor-pointer"
                  style={{ background: "#078a52" }}
                >
                  Terapkan
                </button>
              </div>
            ))}
          </div>
          {unbudgetedSuggestions.length > 0 && (
            <button
              onClick={() => {
                Promise.all(
                  unbudgetedSuggestions.map(([cat, amt]) => applyAiSuggestion(cat, amt))
                ).then(() => setAiSuggestions(null));
              }}
              className="mt-3 w-full py-2 rounded-lg text-sm transition-colors cursor-pointer hover:bg-[#078a52]/15"
              style={{ background: "rgba(7,138,82,0.08)", color: "#078a52" }}
            >
              Terapkan Semua ({unbudgetedSuggestions.length} kategori)
            </button>
          )}
        </div>
      )}

      {aiSuggestions && unbudgetedSuggestions.length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: "rgba(7,138,82,0.08)", border: "1px solid rgba(7,138,82,0.15)", color: "#078a52" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Semua kategori yang disarankan sudah memiliki budget bulan ini.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={cardStyle} className="p-4 space-y-3 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 rounded w-32" style={{ background: "#eee9df" }} />
                <div className="h-4 rounded w-10" style={{ background: "#eee9df" }} />
              </div>
              <div className="h-2 rounded-full" style={{ background: "#eee9df" }} />
              <div className="flex justify-between">
                <div className="h-3 rounded w-24" style={{ background: "#eee9df" }} />
                <div className="h-3 rounded w-20" style={{ background: "#eee9df" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && budgets.length === 0 && (
        <div style={cardStyle} className="p-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(7,138,82,0.08)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <p className="font-medium text-sm" style={{ color: "#000000" }}>Belum ada anggaran untuk {MONTH_NAMES[month - 1]} {year}</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "#9f9b93" }}>Buat batas pengeluaran per kategori atau minta saran dari AI</p>
          <div className="flex gap-2">
            <button
              onClick={handleGetAiSuggestions}
              disabled={aiLoading}
              className="px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer hover:bg-[#eee9df]"
              style={{ background: "#ffffff", border: "1px solid #dad4c8", color: "#55534e" }}
            >
              {aiLoading ? "Menganalisis..." : "Saran AI"}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="clay-btn px-4 py-2 text-white rounded-lg text-sm font-medium cursor-pointer"
              style={{ background: "#078a52" }}
            >
              Tambah Manual
            </button>
          </div>
        </div>
      )}

      {/* Budget list */}
      {!loading && budgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map((budget) => (
            <BudgetRow
              key={budget.id}
              budget={budget}
              month={month}
              year={year}
              onEdit={() => setEditBudget(budget)}
              onDelete={() => handleDelete(budget.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <BudgetModal
          defaultMonth={month}
          defaultYear={year}
          existingCategories={existingCategories}
          onClose={() => setShowCreate(false)}
          onSuccess={fetchBudgets}
        />
      )}
      {editBudget && (
        <BudgetModal
          budget={editBudget}
          defaultMonth={month}
          defaultYear={year}
          onClose={() => setEditBudget(null)}
          onSuccess={fetchBudgets}
        />
      )}

      {/* FAB — mobile + tablet only (hidden on lg+) */}
      <button
        onClick={() => setShowCreate(true)}
        aria-label="Tambah budget"
        className="fab-btn fixed bottom-15 md:bottom-6 right-6 md:right-4 z-30 w-14 h-14 rounded-full items-center justify-center cursor-pointer clay-btn"
        style={{ background: "#078a52", boxShadow: "0 4px 16px rgba(7,138,82,0.35)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  );
}
