import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractTransactionsFromPdfText, categorizeTransaction } from "@/lib/ai";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse");

function parseDate(val: string): Date {
  if (!val) return new Date();
  const parts = val.split(/[\/\-\.]/).map((p) => p.trim());
  if (parts.length === 3) {
    if (parts[0].length === 4) return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return new Date(val);
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

    let extracted: Array<{ tanggal: string; deskripsi: string; jumlah: number; tipe: "INCOME" | "EXPENSE" }>;
    try {
      extracted = await extractTransactionsFromPdfText(pdfText);
    } catch {
      return NextResponse.json(
        { error: "AI gagal mengekstrak transaksi. Pastikan PDF adalah mutasi rekening bank." },
        { status: 422 }
      );
    }

    if (extracted.length === 0) {
      return NextResponse.json({ error: "Tidak ada transaksi yang ditemukan dalam PDF." }, { status: 422 });
    }

    const toImport = extracted.slice(0, 50);
    const created = [];

    for (const t of toImport) {
      const description = t.deskripsi || "Transaksi";
      const amount = Math.abs(t.jumlah) || 0;

      const aiResult = await categorizeTransaction(description, amount);

      const transaction = await prisma.transaction.create({
        data: {
          userId: session.user.id,
          type: t.tipe === "INCOME" ? "INCOME" : "EXPENSE",
          amount,
          category: aiResult.category,
          subcategory: aiResult.subcategory ?? undefined,
          description,
          aiCategorized: true,
          date: parseDate(t.tanggal),
          ...(bankAccountId && { bankAccountId }),
        },
      });

      created.push(transaction);
    }

    return NextResponse.json({
      imported: created.length,
      total: extracted.length,
      preview: toImport.slice(0, 5),
    });
  } catch (err) {
    console.error("PDF import error:", err);
    return NextResponse.json({ error: "Gagal memproses PDF. Coba lagi." }, { status: 500 });
  }
}
