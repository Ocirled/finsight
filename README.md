# FinSight — Personal Finance OS

> **Tema Lomba:** Innovating The Future of Digital Finance

Platform manajemen keuangan pribadi full-stack dengan AI Insight & Open Banking Simulator.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Neon) + Prisma ORM v5 |
| Auth | NextAuth.js v4 (JWT) + 2FA TOTP (`otplib`) |
| AI | Groq SDK (llama-3.3-70b-versatile) |
| Charts | Recharts |
| Forms & Validasi | React Hook Form + Zod v4 |
| Parsing Import | PapaParse (CSV) + pdf-parse (PDF) |
| Deploy | Vercel + Neon |

## Fitur Utama

- **AI Auto-Kategorisasi** — Import mutasi rekening (CSV/PDF), Groq AI otomatis kategorikan + beri insight per transaksi
- **Open Banking Simulator** — Agregasi multi-akun virtual (BCA, GoPay, OVO, dll.) dengan transaksi tersimulasi (Poisson-distributed)
- **Goal-Based Budgeting** — Target tabungan dengan progress + anggaran per kategori dengan AI suggest
- **AI Financial Insights** — Analisis mendalam: breakdown per kategori, heatmap pola pengeluaran, top merchant, perbandingan antar-periode, dan ringkasan naratif AI
- **Security Center** — 2FA TOTP + backup codes + audit log aktivitas + verifikasi email

## Halaman (min. 4 sesuai syarat lomba)

1. `/` — Landing page
2. `/dashboard` — Ringkasan keuangan + grafik bulanan + progress goals + transaksi terbaru
3. `/transactions` — Daftar transaksi + import CSV/PDF + AI kategorisasi + bulk actions (multi-select, delete dengan undo)
4. `/accounts` — Manajemen rekening + Open Banking Simulator
5. `/budget` — Anggaran per kategori + AI suggest
6. `/insights` — AI financial analysis: breakdown kategori, heatmap, top merchant, perbandingan periode
7. `/goals` — Target tabungan
8. `/security` — Audit log + 2FA + backup codes + verifikasi email + ganti profil/password

## Setup Lokal

```bash
# 1. Clone dan install dependencies
git clone <repo-url>
cd finsight
npm install

# 2. Setup environment
cp .env.example .env
# Isi DATABASE_URL, NEXTAUTH_SECRET, GROQ_API_KEY

# 3. Setup database
npx prisma generate
npx prisma db push

# 4. Jalankan dev server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy otomatis ke Vercel. Pastikan environment variables sudah dikonfigurasi di dashboard Vercel.

## Environment Variables

```env
DATABASE_URL=          # PostgreSQL connection string (Neon)
NEXTAUTH_URL=          # URL aplikasi
NEXTAUTH_SECRET=       # Secret untuk JWT (openssl rand -base64 32)
GROQ_API_KEY=          # Groq API key
```

---

## Status Fitur

| Fitur | Status |
|---|---|
| Autentikasi + 2FA (TOTP) | ✅ Done |
| Backup codes 2FA | ✅ Done |
| Email verification | ✅ Done |
| Audit log UI (tab Aktivitas) | ✅ Done |
| Manajemen Transaksi (manual, CSV, PDF) | ✅ Done |
| Bulk actions (multi-select, delete dengan undo, kategorisasi) | ✅ Done |
| Kategorisasi AI (otomatis + manual) | ✅ Done |
| AI Insights naratif per periode | ✅ Done |
| Breakdown pengeluaran per kategori (drill-down) | ✅ Done |
| Heatmap pola pengeluaran (hari × jam, WIB) | ✅ Done |
| Perbandingan antar-periode | ✅ Done |
| Top merchants ranking (drill-down) | ✅ Done |
| Goals / Tabungan | ✅ Done |
| Bank Account Management (saldo terhitung dari transaksi) | ✅ Done |
| Open Banking Simulator (transaksi Poisson per-bank) | ✅ Done |
| Budget / Anggaran per kategori + AI suggest | ✅ Done |
| Grafik bulanan dashboard (Recharts) | ✅ Done |
| Filter tanggal & ringkasan transaksi | ✅ Done |

---
