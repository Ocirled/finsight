import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categorizeTransaction } from "@/lib/ai";

interface CsvRow {
  tanggal?: string;
  date?: string;
  keterangan?: string;
  description?: string;
  deskripsi?: string;
  pemasukan?: string;
  pengeluaran?: string;
  debit?: string;
  kredit?: string;
  credit?: string;
  tipe?: string;
  type?: string;
  [key: string]: string | undefined;
}

function parseAmount(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/[^0-9.-]/g, "")) || 0;
}

function parseDate(val: string | undefined): Date {
  if (!val) return new Date();
  const parts = val.split(/[\/\-\.]/);
  if (parts.length === 3) {
    // dd/mm/yyyy or yyyy-mm-dd
    if (parts[0].length === 4) return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return new Date(val);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rows, bankAccountId }: { rows: CsvRow[]; bankAccountId?: string } = await req.json();

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Tidak ada data" }, { status: 400 });
    }

    // Validate bankAccountId belongs to user if provided
    if (bankAccountId) {
      const account = await prisma.bankAccount.findFirst({
        where: { id: bankAccountId, userId: session.user.id },
      });
      if (!account) {
        return NextResponse.json({ error: "Rekening tidak ditemukan" }, { status: 400 });
      }
    }

    const created = [];

    for (const row of rows.slice(0, 50)) {
      const description =
        row.keterangan || row.description || row.deskripsi || "Transaksi";

      const pengeluaran = parseAmount(row.pengeluaran || row.debit);
      const pemasukan = parseAmount(row.pemasukan || row.kredit || row.credit);
      const amount = pengeluaran || pemasukan;
      const type: "INCOME" | "EXPENSE" =
        pemasukan > 0 && pengeluaran === 0 ? "INCOME" : "EXPENSE";

      const aiResult = await categorizeTransaction(description, amount);

      const transaction = await prisma.transaction.create({
        data: {
          userId: session.user.id,
          type,
          amount,
          category: aiResult.category,
          subcategory: aiResult.subcategory,
          description,
          aiInsight: aiResult.insight,
          aiCategorized: true,
          date: parseDate(row.tanggal || row.date),
          ...(bankAccountId && { bankAccountId }),
        },
      });

      created.push(transaction);
    }

    return NextResponse.json({ imported: created.length });
  } catch {
    return NextResponse.json({ error: "Gagal mengimpor data" }, { status: 500 });
  }
}
