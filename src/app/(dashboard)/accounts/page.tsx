"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { AccountModal } from "@/components/forms/AccountModal";

interface Account {
  id: string;
  name: string;
  bankName: string;
  accountType: string;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  txCount: number;
  isSimulated: boolean;
  lastSyncedAt: string | null;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  savings: "Tabungan",
  checking: "Giro",
  ewallet: "E-Wallet",
  credit: "Kartu Kredit",
};

const BANK_COLORS: Record<string, string> = {
  BCA: "bg-blue-500",
  Mandiri: "bg-amber-600",
  BNI: "bg-orange-500",
  BRI: "bg-blue-700",
  "CIMB Niaga": "bg-red-600",
  GoPay: "bg-sky-500",
  OVO: "bg-purple-600",
  Dana: "bg-blue-400",
  ShopeePay: "bg-orange-500",
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #dad4c8",
  borderRadius: "16px",
  boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px",
};

function bankColor(bankName: string): string {
  return BANK_COLORS[bankName] ?? "bg-[#9f9b93]";
}

function formatLastSynced(iso: string | null): string {
  if (!iso) return "Belum pernah";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} jam lalu`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} hari lalu`;
}

function AccountCard({
  account,
  onEdit,
  onDelete,
  onSyncDone,
}: {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  onSyncDone: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const balanceDiff = account.currentBalance - account.initialBalance;

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/accounts/${account.id}/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data.inserted > 0 ? `+${data.inserted} transaksi baru` : "Sudah sinkron");
        onSyncDone();
      } else {
        setSyncResult("Gagal sinkron");
      }
    } catch {
      setSyncResult("Gagal sinkron");
    }
    setSyncing(false);
    setTimeout(() => setSyncResult(null), 3000);
  }

  return (
    <div style={cardStyle} className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bankColor(account.bankName)}`}>
            <span className="text-white font-bold text-sm">{account.bankName.slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-tight truncate" style={{ color: "#000000" }}>{account.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "#9f9b93" }}>{account.bankName}</p>
          </div>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-md shrink-0"
          style={{ background: "#eee9df", color: "#55534e", border: "1px solid #dad4c8" }}
        >
          {ACCOUNT_TYPE_LABELS[account.accountType] ?? account.accountType}
        </span>
      </div>

      {/* Balance */}
      <div className="space-y-2">
        <div>
          <p className="text-xs mb-0.5" style={{ color: "#9f9b93" }}>Saldo Saat Ini</p>
          <p className={`text-xl font-semibold tabular-nums`} style={{ color: account.currentBalance >= 0 ? "#000000" : "#c0393f" }}>
            {account.currentBalance < 0 ? "-" : ""}{formatCurrency(Math.abs(account.currentBalance))}
          </p>
        </div>
        <div className="flex items-center justify-between text-xs" style={{ color: "#9f9b93" }}>
          <span>Saldo awal {formatCurrency(account.initialBalance)}</span>
          {balanceDiff !== 0 && (
            <span style={{ color: balanceDiff >= 0 ? "#078a52" : "#c0393f" }}>
              {balanceDiff >= 0 ? "+" : ""}{formatCurrency(balanceDiff)}
            </span>
          )}
        </div>
      </div>

      {/* Simulator sync row */}
      {account.isSimulated && (
        <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg" style={{ background: "#faf9f7", border: "1px solid #dad4c8" }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
            </svg>
            <span className="text-xs truncate" style={{ color: syncResult ? (syncResult.startsWith("+") ? "#078a52" : "#9f9b93") : "#9f9b93" }}>
              {syncResult ?? `Terakhir: ${formatLastSynced(account.lastSyncedAt)}`}
            </span>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer disabled:opacity-50 hover:bg-[#078a52]/15"
            style={{ background: "rgba(7,138,82,0.08)", color: "#078a52" }}
          >
            {syncing ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border border-t-transparent rounded-full animate-spin inline-block" style={{ borderColor: "#078a52", borderTopColor: "transparent" }} />
                Sync...
              </span>
            ) : "Sinkronkan"}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="pt-1 flex items-center justify-between" style={{ borderTop: "1px solid #dad4c8" }}>
        <p className="text-xs" style={{ color: "#9f9b93" }}>
          {account.txCount} transaksi tercatat
        </p>
        <div className="flex gap-1">
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
                style={{ background: "rgba(252,121,129,0.1)", color: "#c0393f", border: "1px solid rgba(252,121,129,0.2)" }}
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/accounts");
    if (res.ok) setAccounts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  async function handleDelete(id: string) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
  }

  const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#000000" }}>Rekening</h1>
          <p className="text-sm mt-0.5" style={{ color: "#9f9b93" }}>Kelola rekening bank dan dompet digitalmu</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="clay-btn desktop-btn items-center gap-1.5 px-3.5 py-2 text-white rounded-lg text-sm font-medium cursor-pointer"
          style={{ background: "#078a52" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Rekening
        </button>
      </div>

      {/* Total summary */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div style={cardStyle} className="p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs mb-1" style={{ color: "#9f9b93" }}>Rekening</p>
            <p className="text-lg sm:text-xl font-semibold" style={{ color: "#000000" }}>{accounts.length}</p>
          </div>
          <div className="col-span-2 p-3 sm:p-4" style={cardStyle}>
            <p className="text-[10px] sm:text-xs mb-1" style={{ color: "#9f9b93" }}>Total Saldo</p>
            <p className="text-lg sm:text-xl font-semibold tabular-nums" style={{ color: totalBalance >= 0 ? "#078a52" : "#c0393f" }}>
              {totalBalance < 0 ? "-" : ""}{formatCurrency(Math.abs(totalBalance))}
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
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
              <div className="h-7 rounded w-2/3" style={{ background: "#eee9df" }} />
              <div className="h-3 rounded" style={{ background: "#eee9df" }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && accounts.length === 0 && (
        <div style={cardStyle} className="p-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(7,138,82,0.1)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <p className="font-medium text-sm" style={{ color: "#000000" }}>Belum ada rekening</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "#9f9b93" }}>Tambahkan rekening bank atau dompet digitalmu</p>
          <button
            onClick={() => setShowCreate(true)}
            className="clay-btn px-4 py-2 text-white rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: "#078a52" }}
          >
            Tambah Rekening Pertama
          </button>
        </div>
      )}

      {/* Accounts grid */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={() => setEditAccount(account)}
              onDelete={() => handleDelete(account.id)}
              onSyncDone={fetchAccounts}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <AccountModal onClose={() => setShowCreate(false)} onSuccess={fetchAccounts} />
      )}
      {editAccount && (
        <AccountModal
          account={editAccount}
          onClose={() => setEditAccount(null)}
          onSuccess={fetchAccounts}
        />
      )}

      {/* FAB — mobile + tablet only (hidden on lg+) */}
      <button
        onClick={() => setShowCreate(true)}
        aria-label="Tambah rekening"
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
