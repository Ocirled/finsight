import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categorizeTransaction } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transactionId } = await req.json();

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const result = await categorizeTransaction(
    transaction.description,
    Number(transaction.amount)
  );

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      category: result.category,
      subcategory: result.subcategory,
      aiInsight: result.insight,
      aiCategorized: true,
    },
  });

  return NextResponse.json(updated);
}
