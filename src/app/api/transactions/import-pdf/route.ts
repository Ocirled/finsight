import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractTransactionsFromPdfText, type ExtractedTx } from "@/lib/ai";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse");

// Max transactions saved per import. Categorization now happens inside the
// single extraction call (no per-row AI), so a bulk insert handles this cheaply.
const MAX_IMPORT = 150;

function parseDate(val: string): Date {
  if (!val) return new Date();
  const parts = val.split(/[\/\-\.]/).map((p) => p.trim());
  let d: Date;
  if (parts.length === 3) {
    d = parts[0].length === 4
      ? new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
      : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  } else {
    d = new Date(val);
  }
  // Guard against malformed dates — one Invalid Date would fail the whole
  // createMany batch.
  return isNaN(d.getTime()) ? new Date() : d;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bankAccountId = (formData.get("bankAccountId") as string | null) || undefined;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "File harus berformat PDF" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal 10MB" }, { status: 400 });
    }

    if (bankAccountId) {
      const account = await prisma.bankAccount.findFirst({
        where: { id: bankAccountId, userId: session.user.id },
      });
      if (!account) {
        return NextResponse.json({ error: "Rekening tidak ditemukan" }, { status: 400 });
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const pdfData = await pdfParse(buffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length < 50) {
      return NextResponse.json(
        { error: "PDF tidak bisa dibaca. Pastikan PDF berisi teks (bukan scan/gambar)." },
        { status: 422 }
      );
    }

    let extracted: ExtractedTx[];
    let truncated = false;
    try {
      const result = await extractTransactionsFromPdfText(pdfText);
      extracted = result.transactions.filter((t) => Math.abs(t.jumlah) > 0);
      truncated = result.truncated;
    } catch (e) {
      // Surface the real cause (Groq error, JSON parse, etc.) — the response
      // message below is intentionally generic, so this log is the only way to
      // diagnose why extraction failed.
      console.error("PDF extraction failed:", e);
      return NextResponse.json(
        { error: "AI gagal mengekstrak transaksi. Pastikan PDF adalah mutasi rekening bank." },
        { status: 422 }
      );
    }

    if (extracted.length === 0) {
      return NextResponse.json({ error: "Tidak ada transaksi yang ditemukan dalam PDF." }, { status: 422 });
    }

    const toImport = extracted.slice(0, MAX_IMPORT);

    // Single bulk insert — category/subcategory already came from extraction,
    // so there are no per-row AI calls and no N+1 round-trips.
    const result = await prisma.transaction.createMany({
      data: toImport.map((t) => ({
        userId: session.user.id,
        type: t.tipe === "INCOME" ? "INCOME" : "EXPENSE",
        amount: Math.abs(t.jumlah),
        category: t.category,
        subcategory: t.subcategory ?? undefined,
        description: t.deskripsi || "Transaksi",
        aiCategorized: true,
        date: parseDate(t.tanggal),
        bankAccountId: bankAccountId ?? null,
      })),
    });

    return NextResponse.json({
      imported: result.count,
      total: extracted.length,
      truncated,
      preview: toImport.slice(0, 5),
    });
  } catch (err) {
    console.error("PDF import error:", err);
    return NextResponse.json({ error: "Gagal memproses PDF. Coba lagi." }, { status: 500 });
  }
}
