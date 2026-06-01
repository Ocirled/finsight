"use client";

import { useState, useEffect, useCallback } from "react";

const EMOJI_OPTIONS = [
  "🎯","🏠","🚗","✈️","💍","📱","💻","🎓","🏥","🌴",
  "💰","🏋️","🎸","📚","🐾","🎮","⚽","🏊","🌟","🛍️",
  "🍕","🐕","💒","🎬","🚀","🎁","🏖️","⌚","🎺","💎",
];

interface Goal {
  id: string;
  title: string;
  description: string | null;
  targetAmount: number;
  savedAmount: number;
  deadline: string | null;
  emoji: string | null;
  status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
}

interface Props {
  goal?: Goal;
  onClose: () => void;
  onSuccess: () => void;
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

export function GoalModal({ goal, onClose, onSuccess }: Props) {
  const isEdit = Boolean(goal);
  const [form, setForm] = useState({
    emoji: goal?.emoji ?? "🎯",
    title: goal?.title ?? "",
    description: goal?.description ?? "",
    targetAmount: goal?.targetAmount ? String(goal.targetAmount) : "",
    savedAmount: goal?.savedAmount ? String(goal.savedAmount) : "0",
    deadline: goal?.deadline ? goal.deadline.split("T")[0] : "",
    status: goal?.status ?? "ACTIVE",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    setLoading(true);
    setError("");

    const payload = {
      emoji: form.emoji,
      title: form.title,
      description: form.description || undefined,
      targetAmount: parseFloat(form.targetAmount),
      savedAmount: isEdit ? parseFloat(form.savedAmount) : undefined,
      deadline: form.deadline || undefined,
      status: isEdit ? form.status : undefined,
    };

    const res = await fetch(isEdit ? `/api/goals/${goal!.id}` : "/api/goals", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? "Gagal menyimpan goal");
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
              {isEdit ? "Edit Goal" : "Buat Goal Baru"}
            </h2>
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

            {/* Emoji picker */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#000000" }}>Ikon</label>
              <div className="grid grid-cols-10 gap-1">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                    className="h-8 rounded-md text-base flex items-center justify-center transition-colors cursor-pointer"
                    style={
                      form.emoji === e
                        ? { background: "rgba(7,138,82,0.15)", border: "2px solid #078a52" }
                        : { background: "#faf9f7", border: "1px solid #dad4c8" }
                    }
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Nama Goal</label>
              <input
                type="text"
                required
                maxLength={100}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Contoh: Dana DP Rumah"
                style={inputStyle}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>
                Deskripsi <span className="font-normal" style={{ color: "#9f9b93" }}>(opsional)</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Catatan singkat tentang goal ini"
                style={inputStyle}
              />
            </div>

            {/* Amounts */}
            <div className={`grid gap-3 ${isEdit ? "grid-cols-2" : "grid-cols-1"}`}>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Target (Rp)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.targetAmount}
                  onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>
              {isEdit && (
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Tersimpan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.savedAmount}
                    onChange={(e) => setForm((f) => ({ ...f, savedAmount: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            {/* Deadline + Status row */}
            <div className={`grid gap-3 ${isEdit ? "grid-cols-2" : "grid-cols-1"}`}>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>
                  Deadline <span className="font-normal" style={{ color: "#9f9b93" }}>(opsional)</span>
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  style={{ ...inputStyle, cursor: "pointer" }}
                />
              </div>
              {isEdit && (
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Goal["status"] }))}
                    style={selectStyle}
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="PAUSED">Dijeda</option>
                    <option value="COMPLETED">Selesai</option>
                    <option value="CANCELLED">Dibatalkan</option>
                  </select>
                </div>
              )}
            </div>

            {/* Actions */}
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
                {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Goal"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
