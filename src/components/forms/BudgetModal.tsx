"use client";

import { useState, useEffect, useCallback } from "react";
import { EXPENSE_CATEGORIES } from "@/types";

interface BudgetData {
  id: string;
  category: string;
  limitAmount: number;
  month: number;
  year: number;
}

interface Props {
  budget?: BudgetData;
  defaultMonth: number;
  defaultYear: number;
  existingCategories?: string[];
  prefillCategory?: string;
  prefillAmount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "#faf9f7",
  border: "1px solid #dad4c8",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#000000",
  outline: "none",
};

const selectStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "#faf9f7",
  border: "1px solid #dad4c8",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#000000",
  outline: "none",
  cursor: "pointer",
};

export function BudgetModal({
  budget,
  defaultMonth,
  defaultYear,
  existingCategories = [],
  prefillCategory,
  prefillAmount,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = Boolean(budget);
  const [form, setForm] = useState({
    category: budget?.category ?? prefillCategory ?? EXPENSE_CATEGORIES[0],
    limitAmount: budget ? String(budget.limitAmount) : prefillAmount ? String(prefillAmount) : "",
    month: budget?.month ?? defaultMonth,
    year: budget?.year ?? defaultYear,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const availableCategories = isEdit
    ? EXPENSE_CATEGORIES
    : EXPENSE_CATEGORIES.filter((c) => !existingCategories.includes(c));

  const handleClose = useCallback(() => {
    if (!loading) onClose();
  }, [loading, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      category: form.category,
      limitAmount: parseFloat(form.limitAmount),
      month: form.month,
      year: form.year,
    };

    const res = await fetch(
      isEdit ? `/api/budgets/${budget!.id}` : "/api/budgets",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { limitAmount: payload.limitAmount } : payload),
      }
    );

    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? "Gagal menyimpan anggaran");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto min-h-dvh"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div
          className="w-full max-w-md"
          style={{
            background: "#ffffff",
            border: "1px solid #dad4c8",
            borderRadius: "20px",
            boxShadow: "rgba(0,0,0,0.15) 0px 20px 60px, rgba(0,0,0,0.06) 0px 1px 2px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #dad4c8" }}>
            <h2 className="font-semibold" style={{ color: "#000000" }}>
              {isEdit ? "Edit Anggaran" : "Tambah Anggaran"}
            </h2>
            {!loading && (
              <button
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[#eee9df]"
                style={{ color: "#9f9b93" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: "rgba(252,121,129,0.08)", border: "1px solid rgba(252,121,129,0.2)", color: "#c0393f" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Kategori</label>
              {isEdit ? (
                <div className="px-3.5 py-2.5 rounded-lg text-sm" style={{ background: "#eee9df", border: "1px solid #dad4c8", color: "#55534e" }}>
                  {form.category}
                </div>
              ) : availableCategories.length === 0 ? (
                <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(251,189,65,0.08)", border: "1px solid rgba(251,189,65,0.2)", color: "#d08a11" }}>
                  Semua kategori sudah memiliki anggaran untuk bulan ini
                </div>
              ) : (
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  style={selectStyle}
                >
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Batas Anggaran (Rp)</label>
              <input
                type="number"
                value={form.limitAmount}
                onChange={(e) => setForm((p) => ({ ...p, limitAmount: e.target.value }))}
                required
                min="1"
                placeholder="500000"
                style={inputStyle}
              />
            </div>

            {!isEdit && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Bulan</label>
                  <select
                    value={form.month}
                    onChange={(e) => setForm((p) => ({ ...p, month: parseInt(e.target.value) }))}
                    style={selectStyle}
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Tahun</label>
                  <select
                    value={form.year}
                    onChange={(e) => setForm((p) => ({ ...p, year: parseInt(e.target.value) }))}
                    style={selectStyle}
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {availableCategories.length > 0 || isEdit ? (
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-40 hover:bg-[#eee9df]"
                  style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="clay-btn flex-1 py-2.5 text-white rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50"
                  style={{ background: loading ? "#9f9b93" : "#078a52" }}
                >
                  {loading ? "Menyimpan..." : isEdit ? "Simpan" : "Tambah"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl text-sm transition-colors cursor-pointer hover:bg-[#eee9df]"
                style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}
              >
                Tutup
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
