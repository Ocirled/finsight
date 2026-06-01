"use client";

import { useState } from "react";
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

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "#078a52";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(7,138,82,0.12)";
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = "#dad4c8";
    e.currentTarget.style.boxShadow = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message ?? "Terjadi kesalahan");
      setLoading(false);
    } else {
      router.push("/login?registered=1");
    }
  }

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
          <p className="text-sm mt-3" style={{ color: "#9f9b93" }}>Buat akun baru</p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>
                Nama Lengkap
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="Nama kamu"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="kamu@email.com"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#000000" }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                style={inputStyle}
                placeholder="Min. 8 karakter"
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="clay-btn w-full justify-center py-2.5 rounded-xl font-semibold text-sm text-white mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: loading ? "#9f9b93" : "#078a52" }}
            >
              {loading ? "Mendaftar..." : "Buat Akun"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "#9f9b93" }}>
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold transition-colors cursor-pointer" style={{ color: "#078a52" }}>
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
