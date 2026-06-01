"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { AddTransactionModal } from "@/components/forms/AddTransactionModal";
import { ImportCsvModal } from "@/components/forms/ImportCsvModal";
import { ImportPdfModal } from "@/components/forms/ImportPdfModal";
import { DateRangePicker, DateRange } from "@/components/ui/DateRangePicker";
import { formatCurrency } from "@/lib/utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/types";

function toDateParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_FMT = new Intl.DateTimeFormat("id-ID", { weekday: "short" });
const DATE_FMT = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
function splitDate(iso: string) {
  const d = new Date(iso);
  return { day: DAY_FMT.format(d), date: DATE_FMT.format(d) };
}

const ALL_CATEGORIES = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES.filter(
    (c) => !(EXPENSE_CATEGORIES as readonly string[]).includes(c)
  ),
] as const;

interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  category: string;
  subcategory: string | null;
  description: string;
  merchant: string | null;
  date: string;
  aiCategorized: boolean;
  aiInsight: string | null;
  bankAccount: { name: string; bankName: string } | null;
}

interface AccountOption {
  id: string;
  name: string;
  bankName: string;
}

const TYPE_LABELS = { INCOME: "Pemasukan", EXPENSE: "Pengeluaran", TRANSFER: "Transfer" };
const TYPE_STYLES = {
  INCOME: "bg-[#078a52]/10 text-[#078a52] border border-[#078a52]/20",
  EXPENSE: "bg-[#fc7981]/10 text-[#c0393f] border border-[#fc7981]/20",
  TRANSFER: "bg-[#3bd3fd]/10 text-[#0089ad] border border-[#3bd3fd]/20",
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #dad4c8",
  borderRadius: "16px",
  boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px",
};

const inputStyle: React.CSSProperties = {
  background: "#faf9f7",
  border: "1px solid #dad4c8",
  borderRadius: "8px",
  color: "#000000",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 200ms, box-shadow 200ms",
};

// ─── Undo Toast ──────────────────────────────────────────────────
function UndoToast({
  message,
  onUndo,
  duration = 5000,
}: {
  message: string;
  onUndo: () => void;
  duration?: number;
}) {
  const [pct, setPct] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      setPct(Math.max(0, 100 - (elapsed / duration) * 100));
    }, 50);
    return () => clearInterval(id);
  }, [duration]);

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-max max-w-sm">
      <div
        className="relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-lg"
        style={{ background: "#1a1916", color: "#ffffff", minWidth: "240px" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fc7981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
        <span className="flex-1">{message}</span>
        <button
          onClick={onUndo}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.25)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)"; }}
        >
          Undo
        </button>
        {/* progress bar */}
        <div
          className="absolute bottom-0 left-0 h-0.5 transition-none"
          style={{ width: `${pct}%`, background: "#078a52" }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{ totalIncome: number; totalExpense: number; net: number } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showImportPdf, setShowImportPdf] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [bulkCategory, setBulkCategory] = useState("");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Undo toast
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const pendingDeleteRef = useRef<{ ids: string[]; items: Transaction[] } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAccounts(data); })
      .catch(() => {});
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    const params = new URLSearchParams({
      page: "1", limit: "1",
      ...(search && { search }),
      ...(filterCategory && { category: filterCategory }),
      ...(filterAccount && { bankAccountId: filterAccount }),
      ...(dateRange && { dateFrom: toDateParam(dateRange.start) }),
      ...(dateRange && { dateTo: toDateParam(dateRange.end) }),
    });
    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setSummary(data.summary ?? null);
    setSummaryLoading(false);
  }, [search, filterCategory, filterAccount, dateRange]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page), limit: "20", sortOrder,
      ...(search && { search }),
      ...(filterType && { type: filterType }),
      ...(filterCategory && { category: filterCategory }),
      ...(filterAccount && { bankAccountId: filterAccount }),
      ...(dateRange && { dateFrom: toDateParam(dateRange.start) }),
      ...(dateRange && { dateTo: toDateParam(dateRange.end) }),
    });
    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.transactions ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search, filterType, filterCategory, filterAccount, dateRange, sortOrder]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // Clear selection when page changes
  useEffect(() => { setSelectedIds(new Set()); }, [page]);

  // Flush pending delete on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current && pendingDeleteRef.current) {
        clearTimeout(undoTimerRef.current);
        executeBulkDelete(pendingDeleteRef.current.ids);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function executeBulkDelete(ids: string[]) {
    await fetch("/api/transactions/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    fetchSummary();
    fetchTransactions();
  }

  function scheduleDelete(ids: string[], items: Transaction[]) {
    // Flush any existing pending delete immediately
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
      if (pendingDeleteRef.current) {
        executeBulkDelete(pendingDeleteRef.current.ids);
      }
    }

    // Optimistic remove
    setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
    setTotal((prev) => prev - ids.length);
    setSelectedIds(new Set());

    const msg = ids.length === 1 ? "1 transaksi dihapus" : `${ids.length} transaksi dihapus`;
    setUndoMessage(msg);
    pendingDeleteRef.current = { ids, items };

    undoTimerRef.current = setTimeout(() => {
      if (pendingDeleteRef.current) {
        executeBulkDelete(pendingDeleteRef.current.ids);
        pendingDeleteRef.current = null;
      }
      setUndoMessage(null);
      undoTimerRef.current = null;
    }, 5000);
  }

  function handleUndo() {
    if (!undoTimerRef.current || !pendingDeleteRef.current) return;
    clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;
    const pending = pendingDeleteRef.current;
    pendingDeleteRef.current = null;
    setUndoMessage(null);

    setTransactions((prev) => {
      const existing = new Set(prev.map((t) => t.id));
      const toRestore = pending.items.filter((t) => !existing.has(t.id));
      const combined = [...toRestore, ...prev];
      return combined.sort((a, b) => {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sortOrder === "desc" ? diff : -diff;
      });
    });
    setTotal((prev) => prev + pending.ids.length);
  }

  async function handleCategoryEdit(id: string, newCategory: string) {
    setEditingCategory(null);
    setTransactions((prev) =>
      prev.map((t) => t.id === id ? { ...t, category: newCategory } : t)
    );
    await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory }),
    });
  }

  async function handleBulkCategorize(category: string) {
    if (!category || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setTransactions((prev) =>
      prev.map((t) => ids.includes(t.id) ? { ...t, category } : t)
    );
    setBulkCategory("");
    setSelectedIds(new Set());
    await fetch("/api/transactions/bulk-categorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, category }),
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    }
  }

  const allSelected = transactions.length > 0 && selectedIds.size === transactions.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < transactions.length;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Transaksi</h1>
          <p className="text-sm mt-0.5" style={{ color: "#9f9b93" }}>{total} total transaksi</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImportPdf(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-200 cursor-pointer hover:bg-[#eee9df]"
            style={{ background: "#ffffff", border: "1px solid #dad4c8", color: "#55534e" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Import PDF
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-200 cursor-pointer hover:bg-[#eee9df]"
            style={{ background: "#ffffff", border: "1px solid #dad4c8", color: "#55534e" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="desktop-btn items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 cursor-pointer hover:bg-[#02492a] clay-btn"
            style={{ background: "#078a52", color: "#ffffff" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Transaksi
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="px-4 py-3.5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(7,138,82,0.1)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <p className="text-xs font-medium" style={{ color: "#9f9b93" }}>Pemasukan</p>
          </div>
          {summaryLoading ? (
            <div className="h-5 w-28 rounded-lg animate-pulse" style={{ background: "#eee9df" }} />
          ) : (
            <p className="text-base font-semibold tabular-nums" style={{ color: "#078a52" }}>
              {summary && summary.totalIncome > 0 ? `+${formatCurrency(summary.totalIncome)}` : "—"}
            </p>
          )}
        </div>

        <div className="px-4 py-3.5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(252,121,129,0.1)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fc7981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
              </svg>
            </div>
            <p className="text-xs font-medium" style={{ color: "#9f9b93" }}>Pengeluaran</p>
          </div>
          {summaryLoading ? (
            <div className="h-5 w-28 rounded-lg animate-pulse" style={{ background: "#eee9df" }} />
          ) : (
            <p className="text-base font-semibold tabular-nums" style={{ color: "#fc7981" }}>
              {summary && summary.totalExpense > 0 ? `-${formatCurrency(summary.totalExpense)}` : "—"}
            </p>
          )}
        </div>

        <div className="px-4 py-3.5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: !summary || summary.net >= 0 ? "rgba(7,138,82,0.1)" : "rgba(252,121,129,0.1)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={!summary || summary.net >= 0 ? "#078a52" : "#fc7981"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <p className="text-xs font-medium" style={{ color: "#9f9b93" }}>
              {summary && summary.net < 0 ? "Defisit" : "Surplus"}
            </p>
          </div>
          {summaryLoading ? (
            <div className="h-5 w-28 rounded-lg animate-pulse" style={{ background: "#eee9df" }} />
          ) : (
            <p className="text-base font-semibold tabular-nums" style={{ color: !summary || summary.net >= 0 ? "#078a52" : "#fc7981" }}>
              {!summary || (summary.totalIncome === 0 && summary.totalExpense === 0)
                ? "—"
                : `${summary.net >= 0 ? "+" : ""}${formatCurrency(summary.net)}`}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 flex flex-wrap gap-3" style={cardStyle}>
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 shrink-0" style={{ color: "#9f9b93" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text" placeholder="Cari transaksi..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm"
            style={{ ...inputStyle, paddingLeft: "36px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "8px" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#078a52"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(7,138,82,0.12)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#dad4c8"; e.currentTarget.style.boxShadow = ""; }}
          />
        </div>
        <select
          value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm cursor-pointer" style={inputStyle}
          onFocus={e => { e.currentTarget.style.borderColor = "#078a52"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(7,138,82,0.12)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "#dad4c8"; e.currentTarget.style.boxShadow = ""; }}
        >
          <option value="">Semua Tipe</option>
          <option value="EXPENSE">Pengeluaran</option>
          <option value="INCOME">Pemasukan</option>
        </select>
        <select
          value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm cursor-pointer" style={inputStyle}
          onFocus={e => { e.currentTarget.style.borderColor = "#078a52"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(7,138,82,0.12)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "#dad4c8"; e.currentTarget.style.boxShadow = ""; }}
        >
          <option value="">Semua Kategori</option>
          {EXPENSE_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
        {accounts.length > 0 && (
          <select
            value={filterAccount} onChange={(e) => { setFilterAccount(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm cursor-pointer" style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = "#078a52"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(7,138,82,0.12)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "#dad4c8"; e.currentTarget.style.boxShadow = ""; }}
          >
            <option value="">Semua Rekening</option>
            {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name} ({a.bankName})</option>))}
          </select>
        )}

        {dateRange ? (
          <div className="flex items-center gap-1">
            <DateRangePicker value={dateRange} onChange={(r) => { setDateRange(r); setPage(1); }} />
          </div>
        ) : (
          <button
            onClick={() => { setDateRange({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer hover:bg-[#eee9df]"
            style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Semua Waktu
          </button>
        )}

        {(search || filterType || filterCategory || filterAccount || dateRange) && (
          <button
            onClick={() => { setSearch(""); setFilterType(""); setFilterCategory(""); setFilterAccount(""); setDateRange(null); setPage(1); }}
            className="px-3 py-2 text-sm rounded-xl transition-colors cursor-pointer hover:bg-[#eee9df]"
            style={{ color: "#9f9b93" }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden" style={{ ...cardStyle, padding: 0 }}>
        {/* Bulk action toolbar */}
        {selectedIds.size > 0 && (
          <div
            className="px-5 py-2.5 flex items-center gap-3 flex-wrap"
            style={{ background: "rgba(7,138,82,0.05)", borderBottom: "1px solid rgba(7,138,82,0.15)" }}
          >
            <span className="text-sm font-medium" style={{ color: "#078a52" }}>
              {selectedIds.size} dipilih
            </span>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <select
                value={bulkCategory}
                onChange={(e) => { if (e.target.value) handleBulkCategorize(e.target.value); }}
                className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer"
                style={{ background: "#ffffff", border: "1px solid #dad4c8", color: "#55534e", fontSize: "12px" }}
              >
                <option value="">Kategorikan...</option>
                {ALL_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <button
                onClick={() => {
                  const ids = [...selectedIds];
                  const items = transactions.filter((t) => ids.includes(t.id));
                  scheduleDelete(ids, items);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                style={{ background: "rgba(252,121,129,0.1)", border: "1px solid rgba(252,121,129,0.3)", color: "#c0393f" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(252,121,129,0.18)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(252,121,129,0.1)"; }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
                Hapus
              </button>
            </div>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs transition-colors cursor-pointer"
              style={{ color: "#9f9b93" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#55534e"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9f9b93"; }}
            >
              Batal pilih
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-16 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#078a52", borderTopColor: "transparent" }} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "#eee9df" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9f9b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <p className="font-medium text-sm" style={{ color: "#55534e" }}>Belum ada transaksi</p>
            <p className="text-sm mt-1" style={{ color: "#9f9b93" }}>Tambah manual atau import dari CSV/PDF mutasi rekening</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead style={{ background: "#faf9f7", borderBottom: "1px solid #dad4c8" }}>
                  <tr>
                    {/* Select all */}
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={toggleSelectAll}
                        className="cursor-pointer accent-[#078a52] w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#9f9b93", letterSpacing: "0.06em" }}>
                      <button
                        onClick={() => { setSortOrder((o) => o === "desc" ? "asc" : "desc"); setPage(1); }}
                        className="flex items-center gap-1.5 transition-colors duration-150 cursor-pointer hover:text-black group"
                        style={{ color: "#9f9b93" }}
                      >
                        Tanggal
                        <span className="flex flex-col gap-px">
                          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill={sortOrder === "asc" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: sortOrder === "asc" ? "#078a52" : "#c5c0b8" }}>
                            <polyline points="18 15 12 9 6 15"/>
                          </svg>
                          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill={sortOrder === "desc" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: sortOrder === "desc" ? "#078a52" : "#c5c0b8" }}>
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </span>
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#9f9b93", letterSpacing: "0.06em" }}>Deskripsi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#9f9b93", letterSpacing: "0.06em" }}>
                      <span className="flex items-center gap-1.5">
                        Kategori
                        <span className="font-normal normal-case tracking-normal" style={{ color: "#dad4c8" }}>(klik untuk edit)</span>
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#9f9b93", letterSpacing: "0.06em" }}>Rekening</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#9f9b93", letterSpacing: "0.06em" }}>Tipe</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "#9f9b93", letterSpacing: "0.06em" }}>Jumlah</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr
                      key={t.id}
                      className="transition-colors duration-150"
                      style={{
                        borderBottom: "1px solid #eee9df",
                        background: selectedIds.has(t.id) ? "rgba(7,138,82,0.04)" : undefined,
                      }}
                      onMouseEnter={e => { if (!selectedIds.has(t.id)) (e.currentTarget as HTMLElement).style.background = "#faf9f7"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selectedIds.has(t.id) ? "rgba(7,138,82,0.04)" : ""; }}
                    >
                      <td className="px-4 py-3.5 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="cursor-pointer accent-[#078a52] w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {(() => { const { day, date } = splitDate(t.date); return (
                          <>
                            <p className="text-xs font-medium" style={{ color: "#55534e" }}>{day}</p>
                            <p className="text-xs tabular-nums" style={{ color: "#9f9b93" }}>{date}</p>
                          </>
                        ); })()}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium truncate max-w-44">{t.description}</p>
                        {t.merchant && <p className="text-xs mt-0.5" style={{ color: "#9f9b93" }}>{t.merchant}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        {editingCategory === t.id ? (
                          <select
                            autoFocus defaultValue={t.category}
                            onChange={(e) => handleCategoryEdit(t.id, e.target.value)}
                            onBlur={() => setEditingCategory(null)}
                            className="text-xs rounded-lg px-2 py-1 cursor-pointer"
                            style={{ background: "#faf9f7", border: "1px solid #078a52", color: "#000000", outline: "none", boxShadow: "0 0 0 3px rgba(7,138,82,0.12)" }}
                          >
                            {ALL_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingCategory(t.id)}
                            className="text-xs px-2 py-1 rounded-lg transition-colors duration-150 cursor-pointer hover:border-[#078a52] hover:text-black"
                            style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}
                          >
                            {t.category}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {t.bankAccount ? (
                          <div>
                            <p className="text-xs font-medium" style={{ color: "#55534e" }}>{t.bankAccount.name}</p>
                            <p className="text-xs" style={{ color: "#9f9b93" }}>{t.bankAccount.bankName}</p>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: "#dad4c8" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${TYPE_STYLES[t.type]}`}>
                          {TYPE_LABELS[t.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className="text-sm font-semibold tabular-nums"
                          style={{ color: t.type === "INCOME" ? "#078a52" : "#fc7981" }}
                        >
                          {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 w-10">
                        <button
                          onClick={() => scheduleDelete([t.id], [t])}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 cursor-pointer opacity-0 group-hover:opacity-100"
                          style={{ color: "#9f9b93" }}
                          title="Hapus transaksi"
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(252,121,129,0.1)";
                            (e.currentTarget as HTMLElement).style.color = "#c0393f";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = "";
                            (e.currentTarget as HTMLElement).style.color = "#9f9b93";
                          }}
                          onFocus={e => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(252,121,129,0.1)";
                            (e.currentTarget as HTMLElement).style.color = "#c0393f";
                          }}
                          onBlur={e => {
                            (e.currentTarget as HTMLElement).style.background = "";
                            (e.currentTarget as HTMLElement).style.color = "#9f9b93";
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderTop: "1px solid #dad4c8" }}>
                <p className="text-sm" style={{ color: "#9f9b93" }}>Halaman {page} dari {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer hover:bg-[#eee9df]"
                    style={{ background: "#ffffff", border: "1px solid #dad4c8", color: "#55534e" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer hover:bg-[#eee9df]"
                    style={{ background: "#ffffff", border: "1px solid #dad4c8", color: "#55534e" }}
                  >
                    Berikutnya
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} onSuccess={() => { fetchTransactions(); fetchSummary(); }} />}
      {showImport && <ImportCsvModal onClose={() => setShowImport(false)} onSuccess={() => { fetchTransactions(); fetchSummary(); }} />}
      {showImportPdf && <ImportPdfModal onClose={() => setShowImportPdf(false)} onSuccess={() => { fetchTransactions(); fetchSummary(); }} />}

      {/* FAB — mobile + tablet only */}
      <button
        onClick={() => setShowAdd(true)}
        aria-label="Tambah transaksi"
        className="fab-btn fixed bottom-15 md:bottom-6 right-6 md:right-4 z-30 w-14 h-14 rounded-full items-center justify-center cursor-pointer clay-btn"
        style={{ background: "#078a52", boxShadow: "0 4px 16px rgba(7,138,82,0.35)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Undo toast */}
      {undoMessage && (
        <UndoToast message={undoMessage} onUndo={handleUndo} duration={5000} />
      )}
    </div>
  );
}
