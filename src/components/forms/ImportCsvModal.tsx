"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Papa from "papaparse";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface BankAccountOption {
  id: string;
  name: string;
  bankName: string;
  accountType: string;
}

const selectStyle: React.CSSProperties = {
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

export function ImportCsvModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "importing">("upload");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [accounts, setAccounts] = useState<BankAccountOption[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const canClose = step !== "importing";

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAccounts(data); })
      .catch(() => {});
  }, []);

  const handleClose = useCallback(() => {
    if (canClose) onClose();
  }, [canClose, onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data.length === 0) {
          setError("File CSV kosong atau format tidak dikenali.");
          return;
        }
        setRows(result.data as Record<string, string>[]);
        setStep("preview");
      },
      error: () => setError("Gagal membaca file CSV."),
    });
  }

  async function handleImport() {
    setStep("importing");
    const res = await fetch("/api/transactions/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, bankAccountId: bankAccountId || undefined }),
    });

    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      setError("Gagal mengimpor. Coba lagi.");
      setStep("preview");
    }
  }

  const previewRows = rows.slice(0, 5);
  const headers = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  const selectedAccount = accounts.find((a) => a.id === bankAccountId);

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
          className="w-full max-w-2xl"
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
            <h2 className="font-semibold" style={{ color: "#000000" }}>Import CSV Mutasi Rekening</h2>
            {canClose && (
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

          <div className="p-6">
            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: "rgba(252,121,129,0.08)", border: "1px solid rgba(252,121,129,0.2)", color: "#c0393f" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {step === "upload" && (
              <div className="space-y-4">
                {/* Bank account selector */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>
                    Rekening Bank{" "}
                    <span className="font-normal" style={{ color: "#9f9b93" }}>(opsional)</span>
                  </label>
                  {accounts.length === 0 ? (
                    <div className="text-sm px-3 py-2.5 rounded-xl" style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#9f9b93" }}>
                      Belum ada rekening — tambahkan rekening terlebih dahulu untuk menghubungkan mutasi ini.
                    </div>
                  ) : (
                    <select
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      style={selectStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#078a52"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(7,138,82,0.12)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#dad4c8"; e.currentTarget.style.boxShadow = ""; }}
                    >
                      <option value="">Tidak dihubungkan ke rekening</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} — {a.bankName} ({a.accountType === "savings" ? "Tabungan" : a.accountType === "credit" ? "Kredit" : "Giro"})
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedAccount && (
                    <p className="mt-1.5 text-xs" style={{ color: "#9f9b93" }}>
                      Semua transaksi yang diimpor akan ditautkan ke rekening ini.
                    </p>
                  )}
                </div>

                <div
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl p-10 text-center cursor-pointer transition-colors duration-200"
                  style={{ border: "2px dashed #dad4c8" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(7,138,82,0.4)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#dad4c8")}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "#eee9df" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9f9b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className="font-medium" style={{ color: "#000000" }}>Klik untuk upload file CSV</p>
                  <p className="text-sm mt-1" style={{ color: "#9f9b93" }}>Format CSV standar</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />

                <div className="rounded-xl p-3 text-xs space-y-1.5" style={{ background: "rgba(67,8,159,0.04)", border: "1px solid rgba(67,8,159,0.15)", color: "#43089f" }}>
                  <p className="font-semibold">Format kolom yang didukung:</p>
                  <p className="font-mono tracking-tight" style={{ color: "#6b21a8" }}>tanggal · keterangan · pemasukan · pengeluaran</p>
                  <p style={{ color: "#9f9b93" }}>Alias: date · description · kredit · debit</p>
                </div>
              </div>
            )}

            {step === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: "#55534e" }}>
                    <span className="font-semibold" style={{ color: "#000000" }}>{rows.length} transaksi</span> ditemukan. Menampilkan 5 pertama:
                  </p>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(67,8,159,0.08)", border: "1px solid rgba(67,8,159,0.15)", color: "#43089f" }}>
                    AI kategorisasi otomatis
                  </span>
                </div>

                {selectedAccount && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(7,138,82,0.06)", border: "1px solid rgba(7,138,82,0.2)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    <span style={{ color: "#078a52" }}>
                      Ditautkan ke <span className="font-semibold">{selectedAccount.name}</span> — {selectedAccount.bankName}
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #dad4c8" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "#faf9f7", borderBottom: "1px solid #dad4c8" }}>
                        {headers.map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: "#55534e" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} style={{ borderTop: i > 0 ? "1px solid #dad4c8" : undefined }}>
                          {headers.map((h) => (
                            <td key={h} className="px-3 py-2 max-w-32 truncate" style={{ color: "#55534e" }}>{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {rows.length > 50 && (
                  <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(251,189,65,0.08)", border: "1px solid rgba(251,189,65,0.2)", color: "#d08a11" }}>
                    Hanya 50 transaksi pertama yang akan diimpor untuk menghemat penggunaan AI.
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep("upload"); setRows([]); setError(""); }}
                    className="flex-1 py-2.5 rounded-xl text-sm transition-colors cursor-pointer hover:bg-[#eee9df]"
                    style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}
                  >
                    Ganti File
                  </button>
                  <button
                    onClick={handleImport}
                    className="clay-btn flex-1 py-2.5 text-white rounded-xl text-sm font-medium cursor-pointer"
                    style={{ background: "#078a52" }}
                  >
                    Import &amp; Kategorisasi dengan AI
                  </button>
                </div>
              </div>
            )}

            {step === "importing" && (
              <div className="py-14 text-center space-y-5">
                <div className="relative w-14 h-14 mx-auto">
                  <div className="w-14 h-14 border-2 rounded-full" style={{ borderColor: "#eee9df" }} />
                  <div className="w-14 h-14 border-2 border-t-transparent rounded-full animate-spin absolute inset-0" style={{ borderColor: "#078a52", borderTopColor: "transparent" }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: "#000000" }}>Menganalisis dengan AI...</p>
                  <p className="text-sm mt-1" style={{ color: "#9f9b93" }}>AI sedang mengkategorisasi setiap transaksi</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
