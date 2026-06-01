"use client";

import { useState, useEffect, useCallback } from "react";
import { BANK_LIST } from "@/types";

interface AccountData {
  id: string;
  name: string;
  bankName: string;
  accountType: string;
  initialBalance: number;
  isSimulated?: boolean;
}

interface Props {
  account?: AccountData;
  onClose: () => void;
  onSuccess: () => void;
}

const ACCOUNT_TYPES = [
  { value: "savings", label: "Tabungan" },
  { value: "checking", label: "Giro" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "credit", label: "Kartu Kredit" },
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

export function AccountModal({ account, onClose, onSuccess }: Props) {
  const isEdit = Boolean(account);
  const [form, setForm] = useState({
    name: account?.name ?? "",
    bankName: account?.bankName ?? BANK_LIST[0].name,
    accountType: account?.accountType ?? "savings",
    balance: account ? String(account.initialBalance) : "0",
    isSimulated: account?.isSimulated ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    if (!loading && !syncing) onClose();
  }, [loading, syncing, onClose]);

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
      name: form.name.trim(),
      bankName: form.bankName,
      accountType: form.accountType,
      balance: parseFloat(form.balance) || 0,
      isSimulated: form.isSimulated,
    };

    const res = await fetch(
      isEdit ? `/api/accounts/${account!.id}` : "/api/accounts",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (res.ok) {
      const created = await res.json();
      // Only auto-sync on first creation, never on edit
      if (!isEdit && form.isSimulated) {
        setSyncing(true);
        setLoading(false);
        await fetch(`/api/accounts/${created.id}/sync`, { method: "POST" });
        setSyncing(false);
      }
      onSuccess();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? "Gagal menyimpan rekening");
      setLoading(false);
    }
  }

  const isEwallet = ["gopay", "ovo", "dana", "shopeepay"].includes(form.bankName.toLowerCase());

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
              {isEdit ? "Edit Rekening" : "Tambah Rekening"}
            </h2>
            {!loading && !syncing && (
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
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Nama Rekening</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required maxLength={100}
                placeholder="Contoh: Rekening Gaji, Tabungan Darurat"
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Bank / Platform</label>
                <select
                  value={form.bankName}
                  onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                  style={selectStyle}
                >
                  {BANK_LIST.map((b) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Jenis</label>
                <select
                  value={form.accountType}
                  onChange={(e) => setForm((p) => ({ ...p, accountType: e.target.value }))}
                  style={selectStyle}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>
                Saldo Awal (Rp)
              </label>
              <input
                type="number"
                value={form.balance}
                onChange={(e) => setForm((p) => ({ ...p, balance: e.target.value }))}
                min="0"
                placeholder="0"
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: "#9f9b93" }}>
                Saldo saat ini dihitung otomatis dari transaksi yang masuk
              </p>
            </div>

            {/* Simulator Toggle */}
            <div
              className="rounded-xl p-4 cursor-pointer transition-colors"
              style={{
                background: form.isSimulated ? "rgba(7,138,82,0.06)" : "#faf9f7",
                border: `1px solid ${form.isSimulated ? "rgba(7,138,82,0.25)" : "#dad4c8"}`,
              }}
              onClick={() => setForm((p) => ({ ...p, isSimulated: !p.isSimulated }))}
            >
              <div className="flex items-start gap-3">
                {/* Toggle knob */}
                <div
                  className="relative mt-0.5 shrink-0 w-9 h-5 rounded-full transition-colors duration-200"
                  style={{ background: form.isSimulated ? "#078a52" : "#dad4c8" }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200"
                    style={{ left: form.isSimulated ? "calc(100% - 18px)" : "2px" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold" style={{ color: "#000000" }}>
                      Aktifkan Open Banking Simulator
                    </p>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#9f9b93" }}>
                    {form.isSimulated
                      ? `Akan membuat ~30 hari riwayat transaksi realistis untuk ${isEwallet ? "e-wallet" : "rekening"} ${form.bankName}`
                      : "Generate data transaksi simulasi otomatis berdasarkan pola penggunaan nyata"}
                  </p>
                </div>
              </div>
            </div>

            {/* Syncing state */}
            {syncing && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(7,138,82,0.06)", border: "1px solid rgba(7,138,82,0.15)" }}>
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin shrink-0" style={{ borderColor: "#078a52", borderTopColor: "transparent" }} />
                <p className="text-sm" style={{ color: "#078a52" }}>Membuat data simulasi... ini mungkin butuh beberapa detik</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading || syncing}
                className="flex-1 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-40 hover:bg-[#eee9df]"
                style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || syncing}
                className="clay-btn flex-1 py-2.5 text-white rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50"
                style={{ background: loading || syncing ? "#9f9b93" : "#078a52" }}
              >
                {loading ? "Menyimpan..." : syncing ? "Menyinkronkan..." : isEdit ? "Simpan" : "Tambah"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
