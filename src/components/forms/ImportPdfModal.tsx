"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface PreviewTransaction {
  tanggal: string;
  deskripsi: string;
  jumlah: number;
  tipe: "INCOME" | "EXPENSE";
}

interface BankAccountOption {
  id: string;
  name: string;
  bankName: string;
  accountType: string;
}

type Step = "upload" | "processing" | "success" | "error";

const SUPPORTED_BANKS = ["BCA", "Mandiri", "BNI", "BRI", "CIMB Niaga", "Danamon"];

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

export function ImportPdfModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    total: number;
    truncated?: boolean;
    preview: PreviewTransaction[];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [bankAccountId, setBankAccountId] = useState("");
  const [accounts, setAccounts] = useState<BankAccountOption[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const canClose = step !== "processing";

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

  function handleFileSelect(selected: File | null) {
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setErrorMsg("File harus berformat PDF.");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setErrorMsg("Ukuran file maksimal 10MB.");
      return;
    }
    setErrorMsg("");
    setFile(selected);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0] ?? null);
  }

  async function handleUpload() {
    if (!file) return;
    setStep("processing");

    const formData = new FormData();
    formData.append("file", file);
    if (bankAccountId) formData.append("bankAccountId", bankAccountId);

    try {
      const res = await fetch("/api/transactions/import-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Terjadi kesalahan.");
        setStep("error");
        return;
      }

      setResult(data);
      setStep("success");
      onSuccess();
    } catch {
      setErrorMsg("Koneksi gagal. Periksa internet dan coba lagi.");
      setStep("error");
    }
  }

  const dropZoneBorder = dragOver
    ? "rgba(7,138,82,0.5)"
    : file
    ? "rgba(7,138,82,0.4)"
    : "#dad4c8";
  const dropZoneBg = dragOver
    ? "rgba(7,138,82,0.04)"
    : file
    ? "rgba(7,138,82,0.04)"
    : "transparent";

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
          className="w-full max-w-lg"
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
            <div>
              <h2 className="font-semibold" style={{ color: "#000000" }}>Import PDF Mutasi Rekening</h2>
              <p className="text-xs mt-0.5" style={{ color: "#9f9b93" }}>AI akan ekstrak &amp; kategorisasi otomatis</p>
            </div>
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
            {/* Upload step */}
            {step === "upload" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {SUPPORTED_BANKS.map((b) => (
                    <span key={b} className="text-xs px-2 py-1 rounded-full" style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}>{b}</span>
                  ))}
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#9f9b93" }}>&amp; lainnya</span>
                </div>

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
                      Semua transaksi yang diekstrak akan ditautkan ke rekening ini.
                    </p>
                  )}
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl p-8 text-center cursor-pointer transition-all duration-200"
                  style={{
                    border: `2px dashed ${dropZoneBorder}`,
                    background: dropZoneBg,
                  }}
                >
                  {file ? (
                    <>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(7,138,82,0.1)" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <p className="font-medium break-all" style={{ color: "#000000" }}>{file.name}</p>
                      <p className="text-sm mt-1" style={{ color: "#9f9b93" }}>{(file.size / 1024).toFixed(0)} KB — klik untuk ganti</p>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "#eee9df" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9f9b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <p className="font-medium" style={{ color: "#000000" }}>Drag &amp; drop atau klik untuk upload</p>
                      <p className="text-sm mt-1" style={{ color: "#9f9b93" }}>Format PDF, maksimal 10MB</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="application/pdf" onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)} className="hidden" />

                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: "rgba(252,121,129,0.08)", border: "1px solid rgba(252,121,129,0.2)", color: "#c0393f" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {errorMsg}
                  </div>
                )}

                <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: "rgba(251,189,65,0.06)", border: "1px solid rgba(251,189,65,0.2)", color: "#d08a11" }}>
                  <p className="font-semibold">Tips agar AI berhasil membaca:</p>
                  <p>• Download langsung dari m-banking atau internet banking (bukan scan)</p>
                  <p>• Untuk BCA: myBCA → Rekening → Mutasi → Download PDF</p>
                  <p>• Pastikan PDF tidak terproteksi password</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl text-sm transition-colors cursor-pointer hover:bg-[#eee9df]"
                    style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!file}
                    className="clay-btn flex-1 py-2.5 text-white rounded-xl text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: file ? "#078a52" : "#9f9b93" }}
                  >
                    Proses dengan AI
                  </button>
                </div>
              </div>
            )}

            {/* Processing step */}
            {step === "processing" && (
              <div className="py-14 text-center space-y-5">
                <div className="relative w-14 h-14 mx-auto">
                  <div className="w-14 h-14 border-2 rounded-full" style={{ borderColor: "#eee9df" }} />
                  <div className="w-14 h-14 border-2 border-t-transparent rounded-full animate-spin absolute inset-0" style={{ borderColor: "#078a52", borderTopColor: "transparent" }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: "#000000" }}>AI sedang membaca PDF...</p>
                  <p className="text-sm mt-1" style={{ color: "#9f9b93" }}>Mengekstrak dan mengkategorisasi transaksi</p>
                  {selectedAccount && (
                    <p className="text-xs mt-2 px-3 py-1.5 rounded-lg inline-block" style={{ background: "rgba(7,138,82,0.08)", color: "#078a52" }}>
                      Rekening: {selectedAccount.name} — {selectedAccount.bankName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Success step */}
            {step === "success" && result && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(7,138,82,0.1)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <p className="font-semibold text-lg" style={{ color: "#000000" }}>
                    {result.imported} transaksi berhasil diimpor!
                  </p>
                  {result.total > result.imported && (
                    <p className="text-sm mt-1" style={{ color: "#9f9b93" }}>
                      dari {result.total} yang ditemukan, dibatasi {result.imported}
                    </p>
                  )}
                  {selectedAccount && (
                    <p className="text-xs mt-2" style={{ color: "#9f9b93" }}>
                      Ditautkan ke <span className="font-medium" style={{ color: "#55534e" }}>{selectedAccount.name} — {selectedAccount.bankName}</span>
                    </p>
                  )}
                </div>

                {result.truncated && (
                  <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: "rgba(251,189,65,0.08)", border: "1px solid rgba(251,189,65,0.25)", color: "#d08a11" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>Sebagian transaksi <b>terbaru</b> (tanggal paling akhir) mungkin belum terbaca — statement melebihi kuota baca AI sekali jalan. Untuk melengkapi, impor lagi per rentang tanggal yang lebih pendek (mis. per 2 minggu).</span>
                  </div>
                )}

                {result.preview.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "#9f9b93" }}>Transaksi yang diimpor</p>
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #dad4c8" }}>
                      {result.preview.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-3 py-2.5 text-sm"
                          style={{ borderTop: i > 0 ? "1px solid #dad4c8" : undefined }}
                        >
                          <div className="flex-1 min-w-0 mr-3">
                            <p className="font-medium truncate" style={{ color: "#000000" }}>{t.deskripsi}</p>
                            <p className="text-xs" style={{ color: "#9f9b93" }}>{t.tanggal}</p>
                          </div>
                          <span
                            className="font-semibold text-sm whitespace-nowrap tabular-nums shrink-0"
                            style={{ color: t.tipe === "INCOME" ? "#078a52" : "#c0393f" }}
                          >
                            {t.tipe === "INCOME" ? "+" : "-"}{formatCurrency(t.jumlah)}
                          </span>
                        </div>
                      ))}
                      {result.imported > 5 && (
                        <div className="px-3 py-2 text-xs text-center" style={{ background: "#faf9f7", borderTop: "1px solid #dad4c8", color: "#9f9b93" }}>
                          +{result.imported - 5} transaksi lainnya tersimpan
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleClose}
                  className="clay-btn w-full py-2.5 text-white rounded-xl text-sm font-medium cursor-pointer"
                  style={{ background: "#078a52" }}
                >
                  Lihat Transaksi
                </button>
              </div>
            )}

            {/* Error step */}
            {step === "error" && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(252,121,129,0.1)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c0393f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <p className="font-semibold" style={{ color: "#000000" }}>Gagal memproses PDF</p>
                  <p className="text-sm mt-2 px-3 py-2 rounded-xl" style={{ background: "rgba(252,121,129,0.08)", border: "1px solid rgba(252,121,129,0.2)", color: "#c0393f" }}>{errorMsg}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl text-sm transition-colors cursor-pointer hover:bg-[#eee9df]"
                    style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => { setStep("upload"); setErrorMsg(""); }}
                    className="clay-btn flex-1 py-2.5 text-white rounded-xl text-sm font-medium cursor-pointer"
                    style={{ background: "#078a52" }}
                  >
                    Coba Lagi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
