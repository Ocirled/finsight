import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function askGroq(prompt: string, temperature = 0.1, maxTokens?: number): Promise<string> {
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function categorizeTransaction(
  description: string,
  amount: number
): Promise<{ category: string; subcategory: string; insight: string }> {
  const prompt = `Kamu adalah AI analis keuangan pribadi. Kategorikan transaksi berikut:

Deskripsi: "${description}"
Jumlah: Rp ${amount.toLocaleString("id-ID")}

Berikan respons HANYA dalam format JSON (tanpa markdown, tanpa teks lain):
{"category":"<Makanan & Minuman|Transportasi|Belanja|Hiburan|Kesehatan|Pendidikan|Tagihan & Utilitas|Investasi|Pemasukan|Lainnya>","subcategory":"<sub-kategori spesifik>","insight":"<insight singkat 1 kalimat>"}`;

  try {
    const text = await askGroq(prompt);
    const json = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(json);
  } catch {
    return {
      category: "Lainnya",
      subcategory: "Tidak Dikategorikan",
      insight: "Tidak dapat menganalisis transaksi ini.",
    };
  }
}

function describePeriod(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / 86400000) + 1;
  const fmt = (d: Date) =>
    d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  if (diffDays === 1) return `tanggal ${fmt(start)}`;
  if (diffDays <= 7) return `${diffDays} hari (${fmt(start)} – ${fmt(end)})`;
  if (diffDays <= 31) return `${diffDays} hari (${fmt(start)} – ${fmt(end)})`;
  if (diffDays <= 93) return `${Math.round(diffDays / 7)} minggu (${fmt(start)} – ${fmt(end)})`;
  return `${Math.round(diffDays / 30)} bulan (${fmt(start)} – ${fmt(end)})`;
}

export interface InsightContext {
  start: Date;
  end: Date;
  totalIncome: number;
  totalExpense: number;
  net: number;
  savingsRate: number;
  transactionCount: number;
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number; count: number }>;
  prevPeriod: {
    totalIncome: number;
    totalExpense: number;
    net: number;
    categoryBreakdown: Array<{ category: string; amount: number }>;
  } | null;
  topMerchants: Array<{ merchant: string; amount: number; count: number }>;
  findings: Array<{ title: string; detail: string; severity: string; potentialSaving?: number }>;
}

const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export async function generateInsight(ctx: InsightContext): Promise<string> {
  const period = describePeriod(ctx.start, ctx.end);

  const categoryLines = ctx.categoryBreakdown
    .map((c) => `- ${c.category}: ${rp(c.amount)} (${c.percentage}%, ${c.count}x)`)
    .join("\n") || "- (tidak ada pengeluaran)";

  const merchantLines = ctx.topMerchants
    .slice(0, 5)
    .map((m) => `- ${m.merchant}: ${rp(m.amount)} (${m.count}x)`)
    .join("\n") || "- (tidak ada)";

  const prevBlock = ctx.prevPeriod
    ? `Periode sebelumnya (durasi sama) — Pemasukan ${rp(ctx.prevPeriod.totalIncome)}, Pengeluaran ${rp(ctx.prevPeriod.totalExpense)}, Net ${rp(ctx.prevPeriod.net)}.`
    : "Tidak ada data periode sebelumnya untuk dibandingkan.";

  const findingLines = ctx.findings.length
    ? ctx.findings
        .map(
          (f) =>
            `- [${f.severity}] ${f.title} — ${f.detail}${f.potentialSaving ? ` (potensi ${rp(f.potentialSaving)})` : ""}`
        )
        .join("\n")
    : "- (tidak ada sinyal menonjol; data mungkin masih sedikit)";

  const prompt = `Kamu adalah AI financial advisor untuk aplikasi FinSight.

Periode: ${period}
Pemasukan: ${rp(ctx.totalIncome)} | Pengeluaran: ${rp(ctx.totalExpense)} | ${ctx.net >= 0 ? "Surplus" : "Defisit"}: ${rp(Math.abs(ctx.net))} | Savings rate: ${ctx.savingsRate}%
Jumlah transaksi: ${ctx.transactionCount}

Pengeluaran per kategori (INI SUDAH DITAMPILKAN ke pengguna sebagai grafik — JANGAN sekadar menyebutkannya ulang):
${categoryLines}

${prevBlock}

Top merchant:
${merchantLines}

TEMUAN TERHITUNG SISTEM (fakta akurat — gunakan dan tafsirkan ini, JANGAN menghitung ulang angkanya):
${findingLines}

TUGAS: Tulis analisis keuangan dalam Bahasa Indonesia yang friendly, format markdown, maksimal 180 kata.

ATURAN WAJIB:
- DILARANG sekadar mengulang nominal per kategori yang sudah terlihat di grafik — itu tidak memberi nilai tambah.
- Fokus pada hal yang TIDAK terlihat dari grafik: perubahan vs periode lalu, pola tersembunyi, risiko, dan peluang. Utamakan TEMUAN TERHITUNG di atas.
- Setiap saran HARUS menyertakan angka rupiah dampak atau potensi hematnya secara konkret.
- Jika data sedikit, akui keterbatasannya dan beri 1 saran paling relevan — jangan mengarang pola.
- Jangan gunakan heading '#'. Gunakan **bold** untuk sub-judul dan '- ' untuk poin.
- Struktur: 1 kalimat ringkas kondisi, lalu "**Yang menonjol**" (2-3 poin), lalu "**Saran**" (1-2 poin actionable dengan angka).`;

  try {
    return await askGroq(prompt, 0.5);
  } catch {
    return "Tidak dapat memuat insight AI saat ini. Silakan coba lagi nanti.";
  }
}

export async function suggestBudgets(
  spendingHistory: Record<string, number[]>,
  avgMonthlyIncome: number | null
): Promise<Record<string, number>> {
  if (Object.keys(spendingHistory).length === 0) return {};

  const summaryLines = Object.entries(spendingHistory)
    .map(([cat, amounts]) => {
      const avg = Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length);
      const max = Math.max(...amounts);
      return `${cat}: rata-rata Rp ${avg.toLocaleString("id-ID")}, tertinggi Rp ${max.toLocaleString("id-ID")}`;
    })
    .join("\n");

  const totalAvgSpending = Object.values(spendingHistory).reduce((sum, amounts) => {
    return sum + Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length);
  }, 0);

  const incomeContext = avgMonthlyIncome
    ? `Rata-rata pemasukan bulanan user: Rp ${avgMonthlyIncome.toLocaleString("id-ID")}.
Total rata-rata pengeluaran historis: Rp ${totalAvgSpending.toLocaleString("id-ID")}.
PENTING: Total seluruh budget yang disarankan TIDAK BOLEH melebihi 85% dari pemasukan bulanan (Rp ${Math.round(avgMonthlyIncome * 0.85).toLocaleString("id-ID")}). Jika pengeluaran historis melebihi batas ini, distribusikan secara proporsional agar totalnya pas di batas tersebut.`
    : `Tidak ada data pemasukan. Sarankan limit 10-15% di bawah rata-rata historis.`;

  const prompt = `Kamu adalah AI financial advisor. Berdasarkan historis pengeluaran bulanan user:

${summaryLines}

${incomeContext}

Sarankan limit budget bulanan untuk setiap kategori. Bulatkan ke kelipatan 50.000 terdekat.

Berikan HANYA JSON ini (tanpa teks lain, gunakan nama kategori persis seperti di atas):
{"Kategori": 500000}`;

  try {
    const text = await askGroq(prompt);
    const json = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

// Max characters of extracted PDF text sent to the model. The binding limit is
// Groq's free-tier rate of 12,000 tokens/minute (counted as prompt + max_tokens),
// NOT the model's context window. Statement text is very token-dense (~1.9
// chars/token), so 11k chars ≈ ~5.8k prompt tokens; with ~0.5k boilerplate and
// the 3.5k output reservation below, a request lands at ~9.8k tokens — safely
// under 12k. If the text exceeds this, `truncated` is reported so the caller can
// warn the user instead of silently dropping later transactions.
export const MAX_PDF_CHARS = 11000;

export interface ExtractedTx {
  tanggal: string;
  deskripsi: string;
  jumlah: number;
  tipe: "INCOME" | "EXPENSE";
  category: string;
  subcategory: string | null;
}

export async function extractTransactionsFromPdfText(pdfText: string): Promise<{
  transactions: ExtractedTx[];
  truncated: boolean;
}> {
  const truncated = pdfText.length > MAX_PDF_CHARS;
  const slice = pdfText.slice(0, MAX_PDF_CHARS);

  // Extraction AND categorization in one call — avoids the old N+1 (one Groq
  // call per row), so importing 150 rows costs a single request instead of 150.
  const prompt = `Kamu adalah AI ekstraksi data keuangan. Baca teks mutasi rekening bank berikut, ekstrak SEMUA transaksi, dan kategorikan masing-masing.

Format BCA yang perlu dipahami:
- Kolom: TANGGAL | KETERANGAN | CBG | MUTASI | SALDO
- TANGGAL format dd/mm — tambahkan tahun dari header dokumen (cari "PERIODE" atau bulan/tahun di teks)
- MUTASI: angka diikuti "DB" = pengeluaran (EXPENSE). Angka tanpa "DB" = pemasukan (INCOME)
- Contoh: "125,673.00 DB" → EXPENSE 125673. "680,000.00" tanpa DB → INCOME 680000
- Untuk deskripsi: buat keterangan yang mudah dibaca (contoh: "Transfer ke OVO", "Pemasukan dari FRENKY", "Belanja Gramedia")
- Abaikan: SALDO AWAL, SALDO AKHIR, header tabel, ringkasan MUTASI CR/DB

Kategori — pilih TEPAT satu untuk "category": Makanan & Minuman | Transportasi | Belanja | Hiburan | Kesehatan | Pendidikan | Tagihan & Utilitas | Investasi | Pemasukan | Lainnya
- Jika tipe = INCOME, "category" harus "Pemasukan".
- "subcategory" = sub-kategori spesifik singkat (contoh: "Dompet Digital", "Gaji", "Listrik").

Teks mutasi rekening:
${slice}

Kembalikan HANYA JSON array ini tanpa teks lain, tanpa markdown:
[{"tanggal":"dd/mm/yyyy","deskripsi":"...","jumlah":123456,"tipe":"EXPENSE","category":"...","subcategory":"..."}]`;

  const text = await askGroq(prompt, 0.1, 3500);
  // Robust extraction of the JSON array (tolerant of stray prose/fences).
  const startIdx = text.indexOf("[");
  const endIdx = text.lastIndexOf("]");
  const json = startIdx >= 0 && endIdx > startIdx ? text.slice(startIdx, endIdx + 1) : text;
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("not array");

  const transactions: ExtractedTx[] = parsed.map((t) => ({
    tanggal: typeof t?.tanggal === "string" ? t.tanggal : "",
    deskripsi: typeof t?.deskripsi === "string" && t.deskripsi ? t.deskripsi : "Transaksi",
    jumlah: Number(t?.jumlah) || 0,
    tipe: t?.tipe === "INCOME" ? "INCOME" : "EXPENSE",
    category: typeof t?.category === "string" && t.category ? t.category : "Lainnya",
    subcategory: typeof t?.subcategory === "string" && t.subcategory ? t.subcategory : null,
  }));

  return { transactions, truncated };
}
