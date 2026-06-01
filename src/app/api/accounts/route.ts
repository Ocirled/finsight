import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  bankName: z.string().min(1),
  accountType: z.enum(["savings", "checking", "ewallet", "credit"]),
  balance: z.number().min(0).default(0),
  currency: z.string().default("IDR"),
  isSimulated: z.boolean().default(false),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.bankAccount.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const results = await Promise.all(
    accounts.map(async (acc) => {
      const [incomeAgg, expenseAgg, txCount] = await Promise.all([
        prisma.transaction.aggregate({
          where: { bankAccountId: acc.id, type: "INCOME" },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { bankAccountId: acc.id, type: "EXPENSE" },
          _sum: { amount: true },
        }),
        prisma.transaction.count({ where: { bankAccountId: acc.id } }),
      ]);

      const initialBalance = Number(acc.balance);
      const txIncome = Number(incomeAgg._sum.amount ?? 0);
      const txExpense = Number(expenseAgg._sum.amount ?? 0);

      return {
        id: acc.id,
        name: acc.name,
        bankName: acc.bankName,
        accountType: acc.accountType,
        initialBalance,
        currentBalance: initialBalance + txIncome - txExpense,
        currency: acc.currency,
        isActive: acc.isActive,
        isSimulated: acc.isSimulated,
        lastSyncedAt: acc.lastSyncedAt,
        txCount,
        createdAt: acc.createdAt,
      };
    })
  );

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const account = await prisma.bankAccount.create({
      data: { ...data, userId: session.user.id },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
