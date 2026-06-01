import Link from "next/link";

const features = [
  {
    iconBg: "bg-[#078a52]/10",
    iconColor: "#078a52",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
      </svg>
    ),
    title: "AI Auto-Kategorisasi",
    desc: "Import mutasi rekening atau CSV, AI langsung kategorikan dan beri insight setiap transaksi secara otomatis.",
  },
  {
    iconBg: "bg-[#3bd3fd]/10",
    iconColor: "#0089ad",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="9" width="18" height="12" rx="2"/>
        <path d="M12 3L2 9h20L12 3z"/>
        <path d="M9 21V12"/><path d="M15 21V12"/>
      </svg>
    ),
    title: "Open Banking Simulator",
    desc: "Simulasikan agregasi multi-akun (BCA, GoPay, OVO) dalam satu dashboard terpadu.",
  },
  {
    iconBg: "bg-[#fbbd41]/10",
    iconColor: "#d08a11",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
    title: "Goal-Based Budgeting",
    desc: "Buat target tabungan dengan simulasi progress real-time dan estimasi ketercapaian berbasis AI.",
  },
  {
    iconBg: "bg-[#43089f]/10",
    iconColor: "#43089f",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      </svg>
    ),
    title: "Financial Insights",
    desc: "Laporan bulanan berbasis AI yang menganalisis pola pengeluaran dan memberikan saran actionable.",
  },
  {
    iconBg: "bg-[#fc7981]/10",
    iconColor: "#c0393f",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Keamanan Enterprise",
    desc: "2FA TOTP, audit log aktivitas, dan enkripsi end-to-end untuk melindungi data finansialmu.",
  },
  {
    iconBg: "bg-[#3bd3fd]/10",
    iconColor: "#0089ad",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    ),
    title: "Responsif & Modern",
    desc: "Antarmuka yang nyaman digunakan di desktop maupun smartphone kapan saja dan di mana saja.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ background: "#faf9f7", color: "#000000" }}>
      {/* Navbar */}
      <nav
        className="animate-fade-in-down sticky top-0 z-50 backdrop-blur-xl"
        style={{ background: "rgba(250,249,247,0.85)", borderBottom: "1px solid #dad4c8" }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
            <span className="text-base font-semibold tracking-tight">FinSight</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-colors duration-200 cursor-pointer text-[#55534e] hover:bg-[#eee9df]"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="clay-btn text-sm font-semibold px-5 py-2 rounded-xl text-white"
              style={{ background: "#078a52" }}
            >
              Mulai Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-grid-pattern">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, #faf9f7 0%, transparent 30%, transparent 70%, #faf9f7 100%)" }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full blur-3xl pointer-events-none"
          style={{ background: "rgba(7,138,82,0.06)" }}
        />

        <div className="relative max-w-6xl mx-auto px-4 py-40 text-center">
          <h1
            className="animate-fade-in-up font-semibold leading-none mb-6"
            style={{
              fontSize: "clamp(42px, 7vw, 72px)",
              letterSpacing: "-0.04em",
              lineHeight: "1.0",
              animationDelay: "80ms",
            }}
          >
            Kelola keuangan lebih{" "}
            <span style={{ color: "#078a52" }}>cerdas</span>
            <br />dengan AI
          </h1>

          <p
            className="animate-fade-in-up max-w-2xl mx-auto mb-12 leading-relaxed"
            style={{
              fontSize: "18px",
              color: "#9f9b93",
              lineHeight: "1.6",
              animationDelay: "180ms",
            }}
          >
            FinSight adalah Personal Finance Website dengan AI insight, open banking simulator,
            dan goal tracker — semua dalam satu platform yang aman.
          </p>

          <div
            className="animate-fade-in-up flex items-center justify-center gap-4 flex-wrap"
            style={{ animationDelay: "280ms" }}
          >
            <Link
              href="/register"
              className="clay-btn px-8 py-3.5 rounded-xl font-semibold text-white"
              style={{ background: "#078a52", fontSize: "16px" }}
            >
              Mulai Sekarang — Gratis
            </Link>
            <Link
              href="/login"
              className="clay-btn px-8 py-3.5 rounded-xl font-semibold"
              style={{
                background: "#ffffff",
                border: "1px solid #dad4c8",
                color: "#000000",
                fontSize: "16px",
                boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset",
              }}
            >
              Masuk
            </Link>
          </div>

          <div
            className="animate-fade-in-up flex items-center justify-center gap-8 mt-14 flex-wrap"
            style={{ animationDelay: "380ms", color: "#9f9b93", fontSize: "13px" }}
          >
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              End-to-end encrypted
            </span>
            <span className="w-px h-4" style={{ background: "#dad4c8" }} />
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Gratis selamanya
            </span>
            <span className="w-px h-4" style={{ background: "#dad4c8" }} />
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
              AI-powered insights
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: "#078a52", letterSpacing: "1.08px" }}
          >
            Fitur Lengkap
          </p>
          <h2
            className="font-semibold mb-4"
            style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.88px", lineHeight: "1.1" }}
          >
            Platform keuangan terlengkap
          </h2>
          <p style={{ color: "#9f9b93", fontSize: "18px", lineHeight: "1.6", maxWidth: "520px", margin: "0 auto" }}>
            Semua yang kamu butuhkan untuk mengelola keuangan pribadi dengan lebih cerdas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, index) => (
            <div
              key={f.title}
              className="animate-fade-in-up group rounded-3xl p-6 transition-all duration-200 cursor-default"
              style={{
                background: "#ffffff",
                border: "1px solid #dad4c8",
                borderRadius: "24px",
                boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px",
                animationDelay: `${index * 80}ms`,
              }}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${f.iconBg}`}
                style={{ color: f.iconColor }}
              >
                {f.icon}
              </div>
              <h3 className="font-semibold mb-2" style={{ fontSize: "17px" }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#9f9b93", lineHeight: "1.6" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Matcha (Highlight) Section */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div
          className="rounded-[40px] px-10 py-16 text-center relative overflow-hidden"
          style={{ background: "#02492a" }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle, #84e7a5 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative">
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-5"
              style={{ color: "#84e7a5", letterSpacing: "1.08px" }}
            >
              Analisis Cerdas
            </p>
            <h2
              className="font-semibold mb-5 text-white"
              style={{ fontSize: "clamp(26px, 4vw, 40px)", letterSpacing: "-0.88px", lineHeight: "1.1" }}
            >
              Dari data mentah jadi insight
              <br />yang bisa kamu ambil tindakan
            </h2>
            <p
              className="mb-10 max-w-xl mx-auto leading-relaxed"
              style={{ color: "#84e7a5", fontSize: "17px", lineHeight: "1.6" }}
            >
              AI kami menganalisis setiap transaksi, mendeteksi pola pengeluaran, dan memberikan
              laporan bulanan yang mudah dipahami.
            </p>
            <Link
              href="/register"
              className="clay-btn inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold"
              style={{ background: "#ffffff", color: "#02492a", fontSize: "15px" }}
            >
              Coba Sekarang
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner — Lemon */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div
          className="rounded-3xl p-12 text-center relative overflow-hidden"
          style={{
            background: "#ffffff",
            border: "1px dashed #dad4c8",
            borderRadius: "24px",
            boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset",
          }}
        >
          <h2
            className="font-semibold mb-3"
            style={{ fontSize: "clamp(22px, 3vw, 32px)", letterSpacing: "-0.64px" }}
          >
            Siap mengelola keuangan dengan lebih cerdas?
          </h2>
          <p className="mb-8" style={{ color: "#9f9b93", fontSize: "17px" }}>
            Bergabung dan mulai perjalanan finansialmu hari ini. Gratis, tanpa kartu kredit.
          </p>
          <Link
            href="/register"
            className="clay-btn inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white"
            style={{ background: "#078a52", fontSize: "16px" }}
          >
            Buat Akun Gratis
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #dad4c8" }} className="py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
            <span className="text-sm font-semibold" style={{ color: "#55534e" }}>FinSight</span>
          </div>
          <p className="text-sm" style={{ color: "#9f9b93" }}>Innovating The Future of Digital Finance</p>
          <p className="text-xs" style={{ color: "#9f9b93" }}>© 2025 FinSight. Semua hak dilindungi.</p>
        </div>
      </footer>
    </main>
  );
}
