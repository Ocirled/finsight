import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function askGroq(prompt: string): Promise<string> {
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
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

export async function generateInsight(
  transactions: Array<{ category: string; amount: number; type: string; date: Date }>,
  start: Date,
  end: Date
): Promise<string> {
  const summary = transactions.reduce((acc, t) => {
    if (t.type === "EXPENSE") acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalExpense = Object.values(summary).reduce((a, b) => a + b, 0);
  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((a, t) => a + t.amount, 0);

  const period = describePeriod(start, end);
  const txCount = transactions.length;

  const prompt = `Kamu adalah AI financial advisor untuk aplikasi FinSight. Analisis data keuangan pengguna berikut:

Periode analisis: ${period}
Jumlah transaksi: ${txCount}
Pemasukan total: Rp ${totalIncome.toLocaleString("id-ID")}
Pengeluaran total: Rp ${totalExpense.toLocaleString("id-ID")}
Breakdown pengeluaran per kategori: ${JSON.stringify(summary)}

Buat insight dalam format markdown yang informatif dan actionable (max 200 kata). Sesuaikan analisis dengan periode di atas (misal: jika hanya 7 hari, jangan bandingkan dengan target bulanan). Gunakan bahasa Indonesia yang friendly. Sertakan:
- Ringkasan kondisi keuangan untuk periode ini
- 2-3 pola atau temuan menarik
- 1-2 saran konkret yang relevan dengan durasi periode`;

  try {
    return await askGroq(prompt);
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

export async function extractTransactionsFromPdfText(pdfText: string): Promise<
  Array<{ tanggal: string; deskripsi: string; jumlah: number; tipe: "INCOME" | "EXPENSE" }>
> {
  const prompt = `Kamu adalah AI ekstraksi data keuangan. Baca teks mutasi rekening bank berikut dan ekstrak semua transaksi.

Format BCA yang perlu dipahami:
- Kolom: TANGGAL | KETERANGAN | CBG | MUTASI | SALDO
- TANGGAL format dd/mm — tambahkan tahun dari header dokumen (cari "PERIODE" atau bulan/tahun di teks)
- MUTASI: angka diikuti "DB" = pengeluaran (EXPENSE). Angka tanpa "DB" = pemasukan (INCOME)
- Contoh: "125,673.00 DB" → EXPENSE 125673. "680,000.00" tanpa DB → INCOME 680000
- Untuk deskripsi: buat keterangan yang mudah dibaca (contoh: "Transfer ke OVO", "Pemasukan dari FRENKY", "Belanja Gramedia")
- Abaikan: SALDO AWAL, SALDO AKHIR, header tabel, ringkasan MUTASI CR/DB

Teks mutasi rekening:
${pdfText.slice(0, 6000)}

Kembalikan HANYA JSON array ini tanpa teks lain:
[{"tanggal":"dd/mm/yyyy","deskripsi":"...","jumlah":123456,"tipe":"EXPENSE"}]`;

  const text = await askGroq(prompt);
  const json = text.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("not array");
  return parsed;
}
