"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #dad4c8",
  borderRadius: "24px",
  boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "#faf9f7",
  border: "1px solid #dad4c8",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#000000",
  outline: "none",
  transition: "border-color 200ms, box-shadow 200ms",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [step, setStep] = useState<"credentials" | "otp" | "backup">("credentials");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!data.valid) {
      setError("Email atau password salah");
      setLoading(false);
      return;
    }

    if (data.requiresTwoFactor) {
      setStep("otp");
      setLoading(false);
      return;
    }

    await doSignIn();
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await doSignIn(otp, undefined);
  }

  async function handleBackupCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await doSignIn(undefined, backupCode);
  }

  async function doSignIn(otpCode?: string, bCode?: string) {
    const res = await signIn("credentials", {
      email,
      password,
      ...(otpCode && { otp: otpCode }),
      ...(bCode && { backupCode: bCode }),
      redirect: false,
    });

    if (res?.error) {
      if (bCode) {
        setError("Kode cadangan salah atau sudah digunakan");
      } else if (otpCode) {
        setError("Kode OTP salah atau kadaluarsa");
      } else {
        setError("Email atau password salah");
      }
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#078a52";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(7,138,82,0.12)";
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#dad4c8";
    e.currentTarget.style.boxShadow = "";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-grid-pattern px-4"
      style={{ background: "#faf9f7" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, #faf9f7 0%, transparent 30%, transparent 70%, #faf9f7 100%)" }}
      />
      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
            <span className="text-xl font-semibold tracking-tight">FinSight</span>
          </Link>
          <p className="text-sm mt-3" style={{ color: "#9f9b93" }}>
            {step === "credentials" ? "Masuk ke akun kamu" : "Verifikasi identitasmu"}
          </p>
        </div>

        <div className="p-8" style={cardStyle}>
          {error && (
            <div
              className="mb-5 flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{ background: "rgba(252,121,129,0.1)", border: "1px solid rgba(252,121,129,0.2)", color: "#c0393f" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {step === "credentials" && (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  style={inputStyle} placeholder="kamu@email.com"
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>Password</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  style={inputStyle} placeholder="••••••••"
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="clay-btn w-full justify-center py-2.5 rounded-xl font-semibold text-sm text-white mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: loading ? "#9f9b93" : "#078a52" }}
              >
                {loading ? "Memeriksa..." : "Masuk"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleOtp} className="space-y-4">
              <div className="text-center mb-2">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(7,138,82,0.1)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <p className="text-sm" style={{ color: "#55534e" }}>
                  Masukkan kode 6 digit dari aplikasi authenticator
                </p>
              </div>
              <input
                autoFocus
                type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required placeholder="000000"
                style={{
                  ...inputStyle,
                  textAlign: "center",
                  fontSize: "24px",
                  fontFamily: "monospace",
                  letterSpacing: "0.5em",
                  padding: "12px 14px",
                }}
                onFocus={focusStyle} onBlur={blurStyle}
              />
              <button
                type="submit" disabled={loading || otp.length !== 6}
                className="clay-btn w-full justify-center py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#078a52" }}
              >
                {loading ? "Memverifikasi..." : "Verifikasi"}
              </button>
              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="button" onClick={() => { setStep("backup"); setOtp(""); setError(""); }}
                  className="text-sm transition-colors cursor-pointer"
                  style={{ color: "#9f9b93" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#55534e"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9f9b93"; }}
                >
                  Gunakan kode cadangan
                </button>
                <button
                  type="button" onClick={() => { setStep("credentials"); setOtp(""); setError(""); }}
                  className="text-sm transition-colors cursor-pointer"
                  style={{ color: "#9f9b93" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#000000"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9f9b93"; }}
                >
                  ← Kembali
                </button>
              </div>
            </form>
          )}

          {step === "backup" && (
            <form onSubmit={handleBackupCode} className="space-y-4">
              <div className="text-center mb-2">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(251,189,65,0.1)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d08a11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <p className="text-sm" style={{ color: "#55534e" }}>
                  Masukkan salah satu kode cadangan kamu
                </p>
                <p className="text-xs mt-1" style={{ color: "#9f9b93" }}>
                  Format: XXXXX-XXXXX. Kode hanya bisa digunakan sekali.
                </p>
              </div>
              <input
                autoFocus
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                required
                placeholder="XXXXX-XXXXX"
                maxLength={11}
                style={{
                  ...inputStyle,
                  textAlign: "center",
                  fontFamily: "monospace",
                  letterSpacing: "0.1em",
                  fontSize: "16px",
                  padding: "12px 14px",
                }}
                onFocus={focusStyle} onBlur={blurStyle}
              />
              <button
                type="submit" disabled={loading || backupCode.length < 11}
                className="clay-btn w-full justify-center py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#078a52" }}
              >
                {loading ? "Memverifikasi..." : "Masuk dengan Kode Cadangan"}
              </button>
              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="button" onClick={() => { setStep("otp"); setBackupCode(""); setError(""); }}
                  className="text-sm transition-colors cursor-pointer"
                  style={{ color: "#9f9b93" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#000000"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9f9b93"; }}
                >
                  ← Gunakan kode OTP
                </button>
              </div>
            </form>
          )}
        </div>

        {step === "credentials" && (
          <p className="text-center text-sm mt-6" style={{ color: "#9f9b93" }}>
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold transition-colors cursor-pointer" style={{ color: "#078a52" }}>
              Daftar sekarang
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
