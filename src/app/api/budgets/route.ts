import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  category: z.string().min(1),
  limitAmount: z.number().positive(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()));

  const [budgets, expenseGroups] = await Promise.all([
    prisma.budget.findMany({
      where: { userId: session.user.id, month, year },
      orderBy: { category: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId: session.user.id,
        type: "EXPENSE",
        date: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59),
        },
      },
      _sum: { amount: true },
    }),
  ]);

  const spendingMap: Record<string, number> = Object.fromEntries(
    expenseGroups.map((g) => [g.category, Number(g._sum.amount ?? 0)])
  );

  const results = budgets.map((b) => {
    const spent = spendingMap[b.category] ?? 0;
    const limit = Number(b.limitAmount);
    return {
      id: b.id,
      category: b.category,
      limitAmount: limit,
      spent,
      remaining: Math.max(limit - spent, 0),
      percentage: limit > 0 ? Math.min(Math.round((spent / limit) * 100), 999) : 0,
      month: b.month,
      year: b.year,
    };
  });

  return NextResponse.json({ budgets: results, month, year });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const budget = await prisma.budget.create({
      data: { ...data, userId: session.user.id },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    const e = err as { code?: string };
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "Budget untuk kategori ini di bulan tersebut sudah ada" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
