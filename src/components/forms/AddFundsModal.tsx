"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";

interface Goal {
  id: string;
  title: string;
  emoji: string | null;
  targetAmount: number;
  savedAmount: number;
}

interface Props {
  goal: Goal;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddFundsModal({ goal, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const progress = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);

  const handleClose = useCallback(() => {
    if (!loading) onClose();
  }, [loading, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") handleClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addAmount = parseFloat(amount);
    if (!addAmount || addAmount <= 0) { setError("Masukkan jumlah yang valid"); return; }

    setLoading(true);
    setError("");

    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addAmount }),
    });

    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? "Gagal menambah dana");
      setLoading(false);
    }
  }

  const previewProgress = amount
    ? Math.min(100, Math.round(((goal.savedAmount + parseFloat(amount || "0")) / goal.targetAmount) * 100))
    : progress;

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
          className="w-full max-w-sm"
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
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{goal.emoji ?? "🎯"}</span>
              <div>
                <h2 className="font-semibold text-sm" style={{ color: "#000000" }}>Tambah Dana</h2>
                <p className="text-xs mt-0.5 truncate max-w-48" style={{ color: "#9f9b93" }}>{goal.title}</p>
              </div>
            </div>
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
            {/* Progress preview */}
            <div className="rounded-xl p-3 space-y-2.5" style={{ background: "#faf9f7", border: "1px solid #dad4c8" }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: "#9f9b93" }}>Progress saat ini</span>
                <span className="font-medium tabular-nums" style={{ color: "#000000" }}>{previewProgress}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "#eee9df" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${previewProgress}%`, background: "#078a52" }}
                />
              </div>
              <div className="flex justify-between text-xs tabular-nums">
                <span style={{ color: "#55534e" }}>{formatCurrency(goal.savedAmount)}</span>
                <span style={{ color: "#9f9b93" }}>{formatCurrency(goal.targetAmount)}</span>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>
                Jumlah yang ditambahkan (Rp)
              </label>
              <input
                autoFocus
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#faf9f7",
                  border: "1px solid #dad4c8",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: "#000000",
                  outline: "none",
                }}
              />
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(remaining))}
                  className="mt-1.5 text-xs transition-colors cursor-pointer hover:underline"
                  style={{ color: "#078a52" }}
                >
                  Isi sisa target: {formatCurrency(remaining)}
                </button>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: "rgba(252,121,129,0.08)", border: "1px solid rgba(252,121,129,0.2)", color: "#c0393f" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
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
                {loading ? "Menyimpan..." : "Tambahkan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
