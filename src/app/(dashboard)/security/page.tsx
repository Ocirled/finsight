"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

type Tab = "profil" | "keamanan" | "aktivitas";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  emailVerified: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  ipAddress: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #dad4c8",
  borderRadius: "16px",
  boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px",
};
const inputClass = "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-colors";
const inputStyle = { background: "#faf9f7", border: "1px solid #dad4c8", color: "#000000" };

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Masuk ke aplikasi",
  "2FA_ENABLED": "Mengaktifkan 2FA",
  "2FA_DISABLED": "Menonaktifkan 2FA",
  PROFILE_UPDATED: "Memperbarui profil",
  PASSWORD_CHANGED: "Mengubah password",
  BACKUP_CODES_GENERATED: "Membuat kode cadangan",
  EMAIL_VERIFICATION_SENT: "Mengirim verifikasi email",
  EMAIL_VERIFIED: "Memverifikasi email",
};

function SuccessBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: "rgba(7,138,82,0.08)", border: "1px solid rgba(7,138,82,0.15)", color: "#078a52" }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      {message}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: "rgba(252,121,129,0.08)", border: "1px solid rgba(252,121,129,0.2)", color: "#c0393f" }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {message}
    </div>
  );
}

// ─── Backup Codes Modal ─────────────────────────────────────────
function BackupCodesModal({ codes, onClose }: { codes: string[]; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([
      "FinSight — Kode Cadangan 2FA\n",
      "================================\n",
      "Simpan kode-kode ini di tempat yang aman.\n",
      "Setiap kode hanya bisa digunakan SATU KALI.\n\n",
      codes.join("\n"),
      "\n\nDibuat pada: " + new Date().toLocaleString("id-ID"),
    ], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finsight-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto min-h-dvh"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ background: "#ffffff", border: "1px solid #dad4c8" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(251,189,65,0.1)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d08a11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold" style={{ color: "#000000" }}>Kode Cadangan 2FA</p>
            <p className="text-sm mt-0.5" style={{ color: "#9f9b93" }}>Simpan kode-kode ini dengan aman. Masing-masing hanya bisa digunakan satu kali.</p>
          </div>
        </div>

        <div
          className="rounded-xl p-4 grid grid-cols-2 gap-2"
          style={{ background: "#faf9f7", border: "1px solid #dad4c8" }}
        >
          {codes.map((code, i) => (
            <div key={i} className="font-mono text-sm text-center py-1.5 px-2 rounded-lg" style={{ background: "#ffffff", border: "1px solid #eee9df", color: "#000000" }}>
              {code}
            </div>
          ))}
        </div>

        <div
          className="rounded-lg p-3 flex items-start gap-2 text-xs"
          style={{ background: "rgba(251,189,65,0.08)", border: "1px solid rgba(251,189,65,0.3)", color: "#d08a11" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Kode ini tidak akan ditampilkan lagi. Simpan sebelum menutup jendela ini.
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer hover:bg-[#eee9df]"
            style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            {copied ? "Tersalin!" : "Salin Semua"}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer hover:bg-[#eee9df]"
            style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Unduh .txt
          </button>
          <button
            onClick={onClose}
            className="clay-btn px-4 py-2 text-white rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: "#078a52" }}
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profil Tab ─────────────────────────────────────────────────
function ProfilTab({ profile, onUpdate }: { profile: UserProfile; onUpdate: () => void }) {
  const { update: updateSession } = useSession();

  const [name, setName] = useState(profile.name ?? "");
  const [email, setEmail] = useState(profile.email);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [sendingVerification, setSendingVerification] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  // Handle redirect from email verification (?verified=ok|expired|invalid)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    if (verified === "ok") {
      setProfileMsg({ type: "ok", text: "Email berhasil diverifikasi!" });
      onUpdate();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (verified === "expired") {
      setVerifyMsg({ type: "err", text: "Link verifikasi sudah kadaluarsa. Kirim ulang." });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (verified === "invalid") {
      setVerifyMsg({ type: "err", text: "Link verifikasi tidak valid." });
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setProfileMsg({ type: "ok", text: "Profil berhasil diperbarui" });
      await updateSession();
      onUpdate();
    } else {
      setProfileMsg({ type: "err", text: data.error ?? "Gagal memperbarui profil" });
    }
    setSavingProfile(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) { setPwdMsg({ type: "err", text: "Konfirmasi password tidak cocok" }); return; }
    setSavingPwd(true);
    setPwdMsg(null);
    const res = await fetch("/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwdMsg({ type: "ok", text: "Password berhasil diubah" });
      setCurPwd(""); setNewPwd(""); setConfirmPwd("");
    } else {
      setPwdMsg({ type: "err", text: data.error ?? "Gagal mengubah password" });
    }
    setSavingPwd(false);
  }

  async function handleSendVerification() {
    setSendingVerification(true);
    setVerifyMsg(null);
    setDevUrl(null);
    const res = await fetch("/api/user/send-verification", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setVerifyMsg({ type: "ok", text: "Link verifikasi telah dikirim ke email kamu" });
      if (data.devUrl) setDevUrl(data.devUrl);
    } else {
      setVerifyMsg({ type: "err", text: data.error ?? "Gagal mengirim verifikasi" });
    }
    setSendingVerification(false);
  }

  const joinedDate = new Date(profile.createdAt).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });

  const isVerified = !!profile.emailVerified;

  return (
    <div className="space-y-5">
      {/* Profile info */}
      <div style={cardStyle} className="p-5">
        <h2 className="font-medium mb-4" style={{ color: "#000000" }}>Informasi Akun</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {profileMsg && (
            profileMsg.type === "ok"
              ? <SuccessBanner message={profileMsg.text} onDismiss={() => setProfileMsg(null)} />
              : <ErrorBanner message={profileMsg.text} />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#55534e" }}>Nama</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                required maxLength={80}
                className={inputClass} style={inputStyle} placeholder="Nama lengkap"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#55534e" }}>
                Email
                <span
                  className="ml-2 text-xs px-1.5 py-0.5 rounded-md font-medium"
                  style={isVerified
                    ? { color: "#078a52", background: "rgba(7,138,82,0.08)", border: "1px solid rgba(7,138,82,0.2)" }
                    : { color: "#d08a11", background: "rgba(251,189,65,0.08)", border: "1px solid rgba(251,189,65,0.3)" }
                  }
                >
                  {isVerified ? "Terverifikasi" : "Belum diverifikasi"}
                </span>
              </label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required className={inputClass} style={inputStyle} placeholder="kamu@email.com"
              />
            </div>
          </div>

          {/* Email verification row */}
          {!isVerified && (
            <div className="space-y-2">
              {verifyMsg && (
                verifyMsg.type === "ok"
                  ? <SuccessBanner message={verifyMsg.text} onDismiss={() => setVerifyMsg(null)} />
                  : <ErrorBanner message={verifyMsg.text} />
              )}
              {devUrl && (
                <div className="rounded-lg p-3 text-xs" style={{ background: "rgba(59,211,253,0.06)", border: "1px solid rgba(59,211,253,0.2)", color: "#0089ad" }}>
                  <p className="font-medium mb-1">[DEV] Link verifikasi:</p>
                  <a href={devUrl} className="underline break-all" style={{ color: "#0089ad" }}>{devUrl}</a>
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: "#9f9b93" }}>
                  Verifikasi email untuk meningkatkan keamanan akun
                </p>
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={sendingVerification}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  style={{ background: "rgba(251,189,65,0.08)", border: "1px solid rgba(251,189,65,0.3)", color: "#d08a11" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(251,189,65,0.14)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(251,189,65,0.08)"; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  {sendingVerification ? "Mengirim..." : "Kirim Verifikasi"}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs" style={{ color: "#9f9b93" }}>Bergabung sejak {joinedDate}</p>
            <button
              type="submit" disabled={savingProfile}
              className="clay-btn px-4 py-2 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
              style={{ background: "#078a52" }}
            >
              {savingProfile ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div style={cardStyle} className="p-5">
        <h2 className="font-medium mb-4" style={{ color: "#000000" }}>Ganti Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {pwdMsg && (
            pwdMsg.type === "ok"
              ? <SuccessBanner message={pwdMsg.text} onDismiss={() => setPwdMsg(null)} />
              : <ErrorBanner message={pwdMsg.text} />
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#55534e" }}>Password Saat Ini</label>
            <input
              type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)}
              required placeholder="••••••••"
              className={inputClass} style={inputStyle}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#55534e" }}>Password Baru</label>
              <input
                type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                required minLength={8} placeholder="Min. 8 karakter"
                className={inputClass} style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#55534e" }}>Konfirmasi Password</label>
              <input
                type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                required placeholder="Ulangi password baru"
                className={inputClass}
                style={{ ...inputStyle, border: confirmPwd && confirmPwd !== newPwd ? "1px solid rgba(252,121,129,0.5)" : "1px solid #dad4c8" }}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPwd || !curPwd || !newPwd || newPwd !== confirmPwd}
              className="clay-btn px-4 py-2 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#078a52" }}
            >
              {savingPwd ? "Mengubah..." : "Ganti Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Keamanan Tab ───────────────────────────────────────────────
function KeamananTab({ profile, onUpdate }: { profile: UserProfile; onUpdate: () => void }) {
  const [setupState, setSetupState] = useState<"idle" | "scanning">("idle");
  const [qrCode, setQrCode] = useState("");
  const [setupOtp, setSetupOtp] = useState("");
  const [disableOtp, setDisableOtp] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Backup codes
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [backupRemaining, setBackupRemaining] = useState<number | null>(null);
  const [generatingCodes, setGeneratingCodes] = useState(false);

  const fetchBackupCount = useCallback(async () => {
    const res = await fetch("/api/auth/2fa/backup-codes");
    if (res.ok) {
      const data = await res.json();
      setBackupRemaining(data.remaining);
    }
  }, []);

  useEffect(() => {
    if (profile.twoFactorEnabled) fetchBackupCount();
  }, [profile.twoFactorEnabled, fetchBackupCount]);

  async function startSetup() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
    const data = await res.json();
    if (res.ok) { setQrCode(data.qrCode); setSetupState("scanning"); }
    else setMsg({ type: "err", text: data.error ?? "Gagal memulai setup 2FA" });
    setLoading(false);
  }

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/auth/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: setupOtp }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: "ok", text: "2FA berhasil diaktifkan!" });
      setSetupState("idle");
      setSetupOtp("");
      // Show the generated backup codes immediately
      if (data.backupCodes) {
        setBackupCodes(data.backupCodes);
        setBackupRemaining(data.backupCodes.length);
      }
      onUpdate();
    } else {
      setMsg({ type: "err", text: data.error ?? "Verifikasi gagal" });
    }
    setLoading(false);
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: disableOtp }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ type: "ok", text: "2FA berhasil dinonaktifkan" });
      setShowDisable(false);
      setDisableOtp("");
      setBackupRemaining(null);
      onUpdate();
    } else {
      setMsg({ type: "err", text: data.error ?? "Verifikasi gagal" });
    }
    setLoading(false);
  }

  async function handleGenerateCodes() {
    setGeneratingCodes(true);
    const res = await fetch("/api/auth/2fa/backup-codes", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setBackupCodes(data.codes);
      setBackupRemaining(data.codes.length);
    }
    setGeneratingCodes(false);
  }

  return (
    <div className="space-y-5">
      {/* 2FA card */}
      <div style={cardStyle} className="p-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: profile.twoFactorEnabled ? "rgba(7,138,82,0.1)" : "#eee9df" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={profile.twoFactorEnabled ? "#078a52" : "#9f9b93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium" style={{ color: "#000000" }}>Two-Factor Authentication</p>
              <p className="text-sm mt-0.5" style={{ color: "#9f9b93" }}>Lapisan keamanan tambahan saat login</p>
            </div>
          </div>
          <span
            className="text-xs px-2 py-1 rounded-md font-medium shrink-0"
            style={profile.twoFactorEnabled
              ? { color: "#078a52", background: "rgba(7,138,82,0.08)", border: "1px solid rgba(7,138,82,0.2)" }
              : { color: "#9f9b93", background: "#eee9df", border: "1px solid #dad4c8" }
            }
          >
            {profile.twoFactorEnabled ? "Aktif" : "Nonaktif"}
          </span>
        </div>

        {msg && (
          <div className="mb-4">
            {msg.type === "ok"
              ? <SuccessBanner message={msg.text} onDismiss={() => setMsg(null)} />
              : <ErrorBanner message={msg.text} />}
          </div>
        )}

        {!profile.twoFactorEnabled && (
          <>
            {setupState === "idle" && (
              <button
                onClick={startSetup} disabled={loading}
                className="clay-btn px-4 py-2 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
                style={{ background: "#078a52" }}
              >
                {loading ? "Mempersiapkan..." : "Aktifkan 2FA"}
              </button>
            )}

            {setupState === "scanning" && (
              <div className="space-y-4">
                <div className="rounded-lg p-4 space-y-3" style={{ background: "#faf9f7", border: "1px solid #dad4c8" }}>
                  <p className="text-sm font-medium">Langkah 1 — Scan QR Code</p>
                  <p className="text-xs" style={{ color: "#9f9b93" }}>
                    Buka Google Authenticator, Authy, atau app serupa, lalu scan kode di bawah.
                  </p>
                  {qrCode && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCode} alt="QR Code 2FA" className="w-44 h-44 rounded-lg bg-white p-2" />
                    </div>
                  )}
                </div>

                <div className="rounded-lg p-4 space-y-3" style={{ background: "#faf9f7", border: "1px solid #dad4c8" }}>
                  <p className="text-sm font-medium">Langkah 2 — Verifikasi Kode</p>
                  <p className="text-xs" style={{ color: "#9f9b93" }}>Masukkan kode 6 digit dari aplikasi untuk mengonfirmasi setup.</p>
                  <form onSubmit={handleEnable} className="flex gap-2">
                    <input
                      autoFocus type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                      value={setupOtp} onChange={(e) => setSetupOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="flex-1 px-3.5 py-2.5 rounded-lg text-sm text-center font-mono tracking-widest focus:outline-none"
                      style={inputStyle}
                    />
                    <button
                      type="submit" disabled={loading || setupOtp.length !== 6}
                      className="clay-btn px-4 py-2 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: "#078a52" }}
                    >
                      {loading ? "..." : "Aktifkan"}
                    </button>
                  </form>
                </div>

                <button
                  onClick={() => { setSetupState("idle"); setQrCode(""); setSetupOtp(""); }}
                  className="text-sm transition-colors cursor-pointer hover:text-[#55534e]"
                  style={{ color: "#9f9b93" }}
                >
                  Batalkan setup
                </button>
              </div>
            )}
          </>
        )}

        {profile.twoFactorEnabled && (
          <>
            {!showDisable ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <p className="text-sm" style={{ color: "#55534e" }}>Akun kamu dilindungi dengan 2FA</p>
                </div>
                <button
                  onClick={() => setShowDisable(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:bg-[#fc7981]/10"
                  style={{ border: "1px solid rgba(252,121,129,0.3)", color: "#c0393f" }}
                >
                  Nonaktifkan
                </button>
              </div>
            ) : (
              <div className="rounded-lg p-4 space-y-3" style={{ background: "#faf9f7", border: "1px solid #dad4c8" }}>
                <p className="text-sm font-medium">Konfirmasi Nonaktifkan 2FA</p>
                <p className="text-xs" style={{ color: "#9f9b93" }}>Masukkan kode OTP dari authenticator untuk konfirmasi.</p>
                <form onSubmit={handleDisable} className="flex gap-2">
                  <input
                    autoFocus type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                    value={disableOtp} onChange={(e) => setDisableOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="flex-1 px-3.5 py-2.5 rounded-lg text-sm text-center font-mono tracking-widest focus:outline-none"
                    style={inputStyle}
                  />
                  <button
                    type="submit" disabled={loading || disableOtp.length !== 6}
                    className="clay-btn px-4 py-2 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "#fc7981" }}
                  >
                    {loading ? "..." : "Konfirmasi"}
                  </button>
                </form>
                <button
                  onClick={() => { setShowDisable(false); setDisableOtp(""); }}
                  className="text-sm transition-colors cursor-pointer hover:text-[#55534e]"
                  style={{ color: "#9f9b93" }}
                >
                  Batal
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Backup codes card — only when 2FA enabled */}
      {profile.twoFactorEnabled && (
        <div style={cardStyle} className="p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(251,189,65,0.1)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d08a11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div>
                <p className="font-medium" style={{ color: "#000000" }}>Kode Cadangan</p>
                <p className="text-sm mt-0.5" style={{ color: "#9f9b93" }}>
                  Gunakan jika kehilangan akses ke aplikasi authenticator
                </p>
              </div>
            </div>
            {backupRemaining !== null && (
              <span
                className="text-xs px-2 py-1 rounded-md font-medium shrink-0"
                style={backupRemaining > 3
                  ? { color: "#078a52", background: "rgba(7,138,82,0.08)", border: "1px solid rgba(7,138,82,0.2)" }
                  : backupRemaining > 0
                    ? { color: "#d08a11", background: "rgba(251,189,65,0.08)", border: "1px solid rgba(251,189,65,0.3)" }
                    : { color: "#c0393f", background: "rgba(252,121,129,0.08)", border: "1px solid rgba(252,121,129,0.2)" }
                }
              >
                {backupRemaining} tersisa
              </span>
            )}
          </div>

          {backupRemaining !== null && backupRemaining <= 3 && backupRemaining > 0 && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg text-xs" style={{ background: "rgba(251,189,65,0.08)", border: "1px solid rgba(251,189,65,0.3)", color: "#d08a11" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Kode cadangan kamu hampir habis. Buat ulang segera.
            </div>
          )}

          {backupRemaining === 0 && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg text-xs" style={{ background: "rgba(252,121,129,0.08)", border: "1px solid rgba(252,121,129,0.2)", color: "#c0393f" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Semua kode cadangan telah digunakan. Buat set kode baru sekarang.
            </div>
          )}

          <p className="text-xs mb-4" style={{ color: "#9f9b93" }}>
            Membuat kode baru akan menonaktifkan semua kode lama. Setiap kode hanya bisa digunakan satu kali.
          </p>

          <button
            onClick={handleGenerateCodes}
            disabled={generatingCodes}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 hover:bg-[#eee9df]"
            style={{ background: "#faf9f7", border: "1px solid #dad4c8", color: "#55534e" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
            </svg>
            {generatingCodes ? "Membuat..." : backupRemaining === null ? "Buat Kode Cadangan" : "Buat Ulang Kode"}
          </button>
        </div>
      )}

      {/* Authenticator apps */}
      <div style={cardStyle} className="p-5">
        <p className="text-sm font-medium mb-3" style={{ color: "#55534e" }}>Aplikasi authenticator yang didukung</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {["Google Authenticator", "Microsoft Authenticator", "Authy", "1Password", "Bitwarden", "Apple Passwords"].map((app) => (
            <div key={app} className="flex items-center gap-2 text-xs" style={{ color: "#9f9b93" }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#dad4c8" }} />
              {app}
            </div>
          ))}
        </div>
      </div>

      {/* Backup codes modal */}
      {backupCodes && <BackupCodesModal codes={backupCodes} onClose={() => setBackupCodes(null)} />}
    </div>
  );
}

// ─── Aktivitas Tab ──────────────────────────────────────────────
function AktivitasTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/user/activity?page=${page}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / 20);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function actionLabel(action: string) {
    return ACTION_LABELS[action] ?? action;
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden" style={{ ...cardStyle, padding: 0 }}>
        {loading ? (
          <div className="p-16 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#078a52", borderTopColor: "transparent" }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "#eee9df" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9f9b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className="font-medium text-sm" style={{ color: "#55534e" }}>Belum ada aktivitas tercatat</p>
            <p className="text-sm mt-1" style={{ color: "#9f9b93" }}>Aktivitas keamanan akan muncul di sini</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#eee9df]">
              {logs.map((log) => (
                <div key={log.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-[#faf9f7] transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#eee9df" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9f9b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {log.action === "LOGIN" && <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></>}
                      {log.action === "2FA_ENABLED" && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>}
                      {log.action === "2FA_DISABLED" && <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="1" y1="1" x2="23" y2="23"/></>}
                      {log.action === "PASSWORD_CHANGED" && <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>}
                      {log.action === "PROFILE_UPDATED" && <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>}
                      {log.action === "BACKUP_CODES_GENERATED" && <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>}
                      {(log.action === "EMAIL_VERIFICATION_SENT" || log.action === "EMAIL_VERIFIED") && <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>}
                      {!["LOGIN","2FA_ENABLED","2FA_DISABLED","PASSWORD_CHANGED","PROFILE_UPDATED","BACKUP_CODES_GENERATED","EMAIL_VERIFICATION_SENT","EMAIL_VERIFIED"].includes(log.action) && <circle cx="12" cy="12" r="10"/>}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "#000000" }}>{actionLabel(log.action)}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      <p className="text-xs" style={{ color: "#9f9b93" }}>{formatDate(log.createdAt)}</p>
                      {log.ipAddress && (
                        <p className="text-xs font-mono" style={{ color: "#9f9b93" }}>{log.ipAddress}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderTop: "1px solid #dad4c8" }}>
                <p className="text-sm" style={{ color: "#9f9b93" }}>Halaman {page} dari {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm disabled:opacity-40 cursor-pointer hover:bg-[#eee9df]"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm disabled:opacity-40 cursor-pointer hover:bg-[#eee9df]"
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
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function SecurityPage() {
  const [tab, setTab] = useState<Tab>("profil");
  const [profile, setProfile] = useState<UserProfile | null>(null);

  async function fetchProfile() {
    const res = await fetch("/api/user/profile");
    if (res.ok) setProfile(await res.json());
  }

  useEffect(() => { fetchProfile(); }, []);

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: "profil", label: "Profil" },
    { key: "keamanan", label: "Keamanan" },
    { key: "aktivitas", label: "Aktivitas" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "#000000" }}>Pengaturan</h1>
        <p className="text-sm mt-0.5" style={{ color: "#9f9b93" }}>Kelola akun dan keamananmu</p>
      </div>

      <div className="flex gap-1 rounded-lg p-1 w-fit" style={{ background: "#ffffff", border: "1px solid #dad4c8" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
            style={{
              background: tab === t.key ? "#eee9df" : "transparent",
              color: tab === t.key ? "#000000" : "#9f9b93",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!profile ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} style={cardStyle} className="p-5 space-y-4 animate-pulse">
              <div className="h-4 w-32 rounded" style={{ background: "#eee9df" }} />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 rounded-lg" style={{ background: "#eee9df" }} />
                <div className="h-10 rounded-lg" style={{ background: "#eee9df" }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {tab === "profil" && <ProfilTab profile={profile} onUpdate={fetchProfile} />}
          {tab === "keamanan" && <KeamananTab profile={profile} onUpdate={fetchProfile} />}
          {tab === "aktivitas" && <AktivitasTab />}
        </>
      )}
    </div>
  );
}
