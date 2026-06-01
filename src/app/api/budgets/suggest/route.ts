import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { suggestBudgets } from "@/lib/ai";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()));

  // Analyze the 3 months before the viewed month, not before today
  const viewedMonth = new Date(year, month - 1, 1);

  const history: Record<string, number[]> = {};
  const monthlyIncomes: number[] = [];

  for (let i = 1; i <= 3; i++) {
    const monthDate = subMonths(viewedMonth, i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    const [expenseGroups, incomeAgg] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["category"],
        where: { userId: session.user.id, type: "EXPENSE", date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId: session.user.id, type: "INCOME", date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    for (const g of expenseGroups) {
      if (!history[g.category]) history[g.category] = [];
      history[g.category].push(Number(g._sum.amount ?? 0));
    }

    const monthIncome = Number(incomeAgg._sum.amount ?? 0);
    if (monthIncome > 0) monthlyIncomes.push(monthIncome);
  }

  if (Object.keys(history).length === 0) {
    return NextResponse.json({ suggestions: {}, message: "Belum ada data transaksi di 3 bulan sebelumnya" });
  }

  const avgMonthlyIncome =
    monthlyIncomes.length > 0
      ? Math.round(monthlyIncomes.reduce((a, b) => a + b, 0) / monthlyIncomes.length)
      : null;

  const suggestions = await suggestBudgets(history, avgMonthlyIncome);
  return NextResponse.json({ suggestions });
}
