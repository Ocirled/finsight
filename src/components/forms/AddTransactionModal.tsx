"use client";

import { useState, useEffect, useCallback } from "react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/types";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface BankAccountOption {
  id: string;
  name: string;
  bankName: string;
  currentBalance: number;
}

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

export function AddTransactionModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    amount: "",
    description: "",
    merchant: "",
    category: "auto",
    date: new Date().toISOString().split("T")[0],
    bankAccountId: "",
  });
  const [accounts, setAccounts] = useState<BankAccountOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAccounts(data); })
      .catch(() => {});
  }, []);

  const categories = form.type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const selectedAccount = accounts.find((a) => a.id === form.bankAccountId) ?? null;
  const parsedAmount = parseFloat(form.amount) || 0;
  const balanceAfter =
    selectedAccount && form.type === "EXPENSE" && parsedAmount > 0
      ? selectedAccount.currentBalance - parsedAmount
      : null;
  const insufficientBalance = balanceAfter !== null && balanceAfter < 0;

  const handleClose = useCallback(() => {
    if (!loading) onClose();
  }, [loading, onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    if (name === "type") {
      setForm((prev) => ({ ...prev, type: value as "INCOME" | "EXPENSE", category: "auto" }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        category: form.category === "auto" ? "Lainnya" : form.category,
        bankAccountId: form.bankAccountId || undefined,
      }),
    });

    if (res.ok) {
      const transaction = await res.json();
      if (form.category === "auto") {
        fetch("/api/transactions/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: transaction.id }),
        }).catch(() => {});
      }
      onSuccess();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? "Gagal menyimpan transaksi");
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
            <h2 className="font-semibold" style={{ color: "#000000" }}>Tambah Transaksi</h2>
            {!loading && (
              <button
                onClick={handleClose}
                aria-label="Tutup"
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

            {/* Type toggle */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #dad4c8" }}>
              {(["EXPENSE", "INCOME"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, type: t, category: "auto" }))}
                  className="flex-1 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
                  style={
                    form.type === t
                      ? t === "EXPENSE"
                        ? { background: "rgba(252,121,129,0.12)", color: "#c0393f" }
                        : { background: "rgba(7,138,82,0.1)", color: "#078a52" }
                      : { background: "transparent", color: "#9f9b93" }
                  }
                >
                  {t === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Jumlah (Rp)</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                required
                min="1"
                placeholder="0"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Deskripsi</label>
              <input
                type="text"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                placeholder="Contoh: Makan siang di warung padang"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Kategori</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
                style={selectStyle}
              >
                <option value="auto">Auto — AI akan kategorikan</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {accounts.length > 0 && (
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Rekening <span className="font-normal" style={{ color: "#9f9b93" }}>(opsional)</span></label>
                  <select
                    name="bankAccountId"
                    value={form.bankAccountId}
                    onChange={handleChange}
                    style={{
                      ...selectStyle,
                      border: insufficientBalance ? "1px solid rgba(252,121,129,0.5)" : "1px solid #dad4c8",
                    }}
                  >
                    <option value="">Tidak ada</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.bankName}) — {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(a.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>

                {insufficientBalance && (
                  <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: "rgba(252,121,129,0.08)", border: "1px solid rgba(252,121,129,0.2)", color: "#c0393f" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>
                      Saldo tidak cukup. Saldo rekening saat ini{" "}
                      <span className="font-medium">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(selectedAccount!.currentBalance)}</span>
                      , pengeluaran ini akan melebihi saldo sebesar{" "}
                      <span className="font-medium">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.abs(balanceAfter!))}</span>.
                    </span>
                  </div>
                )}

                {balanceAfter !== null && balanceAfter >= 0 && parsedAmount > 0 && (
                  <p className="text-xs" style={{ color: "#9f9b93" }}>
                    Sisa saldo setelah transaksi:{" "}
                    <span className="font-medium" style={{ color: "#55534e" }}>
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(balanceAfter)}
                    </span>
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>
                  Merchant <span className="font-normal" style={{ color: "#9f9b93" }}>(opsional)</span>
                </label>
                <input
                  type="text"
                  name="merchant"
                  value={form.merchant}
                  onChange={handleChange}
                  placeholder="Nama toko/merchant"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Tanggal</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                  style={{ ...inputStyle, cursor: "pointer" }}
                />
              </div>
            </div>

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
                disabled={loading || insufficientBalance}
                className="clay-btn flex-1  py-2.5 text-white rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50"
                style={{ background: loading || insufficientBalance ? "#9f9b93" : "#078a52" }}
              >
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
