"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { GoalModal } from "@/components/forms/GoalModal";
import { AddFundsModal } from "@/components/forms/AddFundsModal";

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

const STATUS_LABEL: Record<Goal["status"], string> = {
  ACTIVE: "Aktif",
  COMPLETED: "Selesai",
  PAUSED: "Dijeda",
  CANCELLED: "Dibatalkan",
};

const STATUS_STYLE: Record<Goal["status"], React.CSSProperties> = {
  ACTIVE: { color: "#078a52", background: "rgba(7,138,82,0.08)", border: "1px solid rgba(7,138,82,0.2)" },
  COMPLETED: { color: "#0089ad", background: "rgba(59,211,253,0.08)", border: "1px solid rgba(59,211,253,0.2)" },
  PAUSED: { color: "#d08a11", background: "rgba(251,189,65,0.08)", border: "1px solid rgba(251,189,65,0.2)" },
  CANCELLED: { color: "#9f9b93", background: "#eee9df", border: "1px solid #dad4c8" },
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #dad4c8",
  borderRadius: "16px",
  boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px",
};

type FilterTab = "ALL" | "ACTIVE" | "PAUSED" | "COMPLETED";

function formatDeadline(deadline: string): { text: string; urgent: boolean } {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `Lewat ${Math.abs(days)} hari`, urgent: true };
  if (days === 0) return { text: "Hari ini", urgent: true };
  if (days === 1) return { text: "Besok", urgent: true };
  if (days < 30) return { text: `${days} hari lagi`, urgent: days < 7 };
  if (days < 365) return { text: `${Math.round(days / 30)} bulan lagi`, urgent: false };
  return { text: `${(days / 365).toFixed(1)} tahun lagi`, urgent: false };
}

function GoalCard({
  goal,
  onEdit,
  onAddFunds,
  onStatusChange,
  onDelete,
}: {
  goal: Goal;
  onEdit: () => void;
  onAddFunds: () => void;
  onStatusChange: (status: Goal["status"]) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const progress = goal.targetAmount > 0
    ? Math.min(100, Math.round((Number(goal.savedAmount) / Number(goal.targetAmount)) * 100))
    : 0;
  const deadline = goal.deadline ? formatDeadline(goal.deadline) : null;

  return (
    <div style={cardStyle} className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="text-2xl w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#eee9df" }}
          >
            {goal.emoji ?? "🎯"}
          </span>
          <div className="min-w-0">
            <p className="font-semibold truncate" style={{ color: "#000000" }}>{goal.title}</p>
            {goal.description && (
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#9f9b93" }}>{goal.description}</p>
            )}
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded-md font-medium shrink-0" style={STATUS_STYLE[goal.status]}>
          {STATUS_LABEL[goal.status]}
        </span>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-base font-semibold tabular-nums" style={{ color: "#000000" }}>
            {formatCurrency(Number(goal.savedAmount))}
          </span>
          <span className="text-sm font-bold tabular-nums" style={{ color: progress >= 100 ? "#078a52" : "#9f9b93" }}>
            {progress}%
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#eee9df" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: progress >= 100 ? "#078a52" : "#078a52" }}
          />
        </div>
        <p className="text-xs mt-1.5 text-right tabular-nums" style={{ color: "#9f9b93" }}>
          Target {formatCurrency(Number(goal.targetAmount))}
        </p>
      </div>

      {/* Deadline */}
      {deadline && (
        <div className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: deadline.urgent ? "#d08a11" : "#9f9b93" }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="text-xs" style={{ color: deadline.urgent ? "#d08a11" : "#9f9b93" }}>
            {deadline.text}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1" style={{ borderTop: "1px solid #dad4c8" }}>
        {goal.status === "ACTIVE" && progress < 100 && (
          <button
            onClick={onAddFunds}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-[#078a52]/15"
            style={{ background: "rgba(7,138,82,0.08)", color: "#078a52" }}
          >
            + Tambah Dana
          </button>
        )}
        {goal.status === "ACTIVE" && progress >= 100 && (
          <button
            onClick={() => onStatusChange("COMPLETED")}
            className="clay-btn flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer"
            style={{ background: "#078a52" }}
          >
            ✓ Tandai Selesai
          </button>
        )}
        {goal.status === "PAUSED" && (
          <button
            onClick={() => onStatusChange("ACTIVE")}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-[#3bd3fd]/15"
            style={{ background: "rgba(59,211,253,0.08)", color: "#0089ad" }}
          >
            ▶ Aktifkan
          </button>
        )}

        {/* Icon buttons */}
        <div className="flex gap-1 ml-auto">
          {goal.status === "ACTIVE" && (
            <button
              onClick={() => onStatusChange("PAUSED")}
              title="Jeda"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[#fbbd41]/15 hover:text-[#d08a11]"
              style={{ color: "#9f9b93" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
          )}
          <button
            onClick={onEdit}
            title="Edit"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[#eee9df]"
            style={{ color: "#9f9b93" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={onDelete}
                className="px-2 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                style={{ background: "rgba(252,121,129,0.1)", color: "#c0393f" }}
              >
                Hapus?
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-xs hover:bg-[#eee9df]"
                style={{ color: "#9f9b93" }}
              >
                ✕
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Hapus"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[#fc7981]/10 hover:text-[#c0393f]"
              style={{ color: "#9f9b93" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
  { key: "ALL", label: "Semua" },
  { key: "ACTIVE", label: "Aktif" },
  { key: "PAUSED", label: "Dijeda" },
  { key: "COMPLETED", label: "Selesai" },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [addFundsGoal, setAddFundsGoal] = useState<Goal | null>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/goals");
    if (res.ok) setGoals(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  async function handleStatusChange(id: string, status: Goal["status"]) {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, status } : g));
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchGoals();
  }

  async function handleDelete(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
  }

  const filtered = filter === "ALL" ? goals : goals.filter((g) => g.status === filter);

  const activeGoals = goals.filter((g) => g.status === "ACTIVE");
  const totalSaved = activeGoals.reduce((s, g) => s + Number(g.savedAmount), 0);
  const totalTarget = activeGoals.reduce((s, g) => s + Number(g.targetAmount), 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#000000" }}>Goals</h1>
          <p className="text-sm mt-0.5" style={{ color: "#9f9b93" }}>Atur dan pantau target tabunganmu</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="clay-btn desktop-btn items-center gap-1.5 px-3.5 py-2 text-white rounded-lg text-sm font-medium cursor-pointer"
          style={{ background: "#078a52" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Buat Goal
        </button>
      </div>

      {/* Summary cards */}
      {!loading && activeGoals.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div style={cardStyle} className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs mb-1" style={{ color: "#9f9b93" }}>Goals Aktif</p>
            <p className="text-lg sm:text-xl font-semibold" style={{ color: "#000000" }}>{activeGoals.length}</p>
          </div>
          <div style={cardStyle} className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs mb-1" style={{ color: "#9f9b93" }}>Tersimpan</p>
            <p className="text-sm sm:text-xl font-semibold tabular-nums" style={{ color: "#078a52" }}>{formatCurrency(totalSaved)}</p>
          </div>
          <div style={cardStyle} className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs mb-1" style={{ color: "#9f9b93" }}>Progress</p>
            <p className="text-lg sm:text-xl font-semibold tabular-nums" style={{ color: "#078a52" }}>{overallProgress}%</p>
            <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "#eee9df" }}>
              <div className="h-full rounded-full" style={{ width: `${overallProgress}%`, background: "#078a52" }} />
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {!loading && goals.length > 0 && (
        <div className="flex gap-1 rounded-lg p-1 w-fit" style={{ background: "#ffffff", border: "1px solid #dad4c8" }}>
          {FILTER_TABS.map((tab) => {
            const count = tab.key === "ALL" ? goals.length : goals.filter((g) => g.status === tab.key).length;
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                style={{
                  background: active ? "#eee9df" : "transparent",
                  color: active ? "#000000" : "#9f9b93",
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span className="text-xs tabular-nums" style={{ color: active ? "#55534e" : "#9f9b93" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={cardStyle} className="p-5 space-y-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl" style={{ background: "#eee9df" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded w-3/4" style={{ background: "#eee9df" }} />
                  <div className="h-3 rounded w-1/2" style={{ background: "#eee9df" }} />
                </div>
              </div>
              <div className="h-2.5 rounded-full" style={{ background: "#eee9df" }} />
              <div className="h-8 rounded-lg" style={{ background: "#eee9df" }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={cardStyle} className="p-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(7,138,82,0.08)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <p className="font-medium text-sm" style={{ color: "#000000" }}>
            {filter === "ALL" ? "Belum ada goal" : `Tidak ada goal ${STATUS_LABEL[filter as Goal["status"]]?.toLowerCase()}`}
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: "#9f9b93" }}>
            {filter === "ALL" ? "Mulai buat target tabungan pertamamu" : "Coba filter lain atau buat goal baru"}
          </p>
          {filter === "ALL" && (
            <button
              onClick={() => setShowCreate(true)}
              className="clay-btn px-4 py-2 text-white rounded-lg text-sm font-medium cursor-pointer"
              style={{ background: "#078a52" }}
            >
              Buat Goal Pertama
            </button>
          )}
        </div>
      )}

      {/* Goals grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setEditGoal(goal)}
              onAddFunds={() => setAddFundsGoal(goal)}
              onStatusChange={(status) => handleStatusChange(goal.id, status)}
              onDelete={() => handleDelete(goal.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <GoalModal onClose={() => setShowCreate(false)} onSuccess={fetchGoals} />
      )}
      {editGoal && (
        <GoalModal goal={editGoal} onClose={() => setEditGoal(null)} onSuccess={fetchGoals} />
      )}
      {addFundsGoal && (
        <AddFundsModal goal={addFundsGoal} onClose={() => setAddFundsGoal(null)} onSuccess={fetchGoals} />
      )}

      {/* FAB — mobile + tablet only (hidden on lg+) */}
      <button
        onClick={() => setShowCreate(true)}
        aria-label="Buat goal baru"
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
