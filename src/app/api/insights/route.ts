import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateInsight } from "@/lib/ai";
import { startOfMonth, endOfMonth } from "date-fns";

function parseDate(param: string | null, fallback: Date) {
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
    const [y, m, d] = param.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return fallback;
}

type TxDetail = { date: string; description: string; amount: number };

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();

  const startDate = parseDate(searchParams.get("start"), startOfMonth(now));
  startDate.setHours(0, 0, 0, 0);
  const endDate = parseDate(searchParams.get("end"), endOfMonth(now));
  endDate.setHours(23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: startDate, lte: endDate },
    },
    select: { category: true, amount: true, type: true, date: true, description: true, merchant: true },
    orderBy: { date: "asc" },
  });

  if (transactions.length === 0) {
    return NextResponse.json({
      totalIncome: 0, totalExpense: 0, net: 0, savingsRate: 0, transactionCount: 0,
      categoryBreakdown: [], aiInsight: null,
      heatmap: [], topMerchants: [],
      prevPeriod: null,
    });
  }

  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
  const net = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;

  // ── Category breakdown ─────────────────────────────────────────
  type TxEntry = { date: Date; description: string; amount: number };
  const categoryMap = new Map<string, { amount: number; txs: TxEntry[] }>();
  for (const t of transactions) {
    if (t.type !== "EXPENSE") continue;
    const prev = categoryMap.get(t.category) ?? { amount: 0, txs: [] };
    categoryMap.set(t.category, {
      amount: prev.amount + Number(t.amount),
      txs: [...prev.txs, { date: t.date, description: t.description, amount: Number(t.amount) }],
    });
  }
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, { amount, txs }]) => ({
      category, amount, count: txs.length,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      transactions: txs,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // ── Heatmap: per-date spending (WIB = UTC+7) ──────────────────
  const heatmapMap = new Map<string, { amount: number; txs: TxDetail[] }>();
  for (const t of transactions) {
    if (t.type !== "EXPENSE") continue;
    const wib = new Date(t.date.getTime() + 7 * 3600_000);
    const dateKey = `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}-${String(wib.getUTCDate()).padStart(2, "0")}`;
    const prev = heatmapMap.get(dateKey) ?? { amount: 0, txs: [] };
    heatmapMap.set(dateKey, {
      amount: prev.amount + Number(t.amount),
      txs: [...prev.txs, { date: t.date.toISOString(), description: t.description, amount: Number(t.amount) }],
    });
  }
  const heatmap = Array.from(heatmapMap.entries()).map(([date, { amount, txs }]) => ({ date, amount, txs }));

  // ── Top merchants with transaction detail ──────────────────────
  const merchantMap = new Map<string, { amount: number; count: number; txs: TxDetail[] }>();
  for (const t of transactions) {
    if (t.type !== "EXPENSE") continue;
    const key = t.merchant || t.description;
    if (!key) continue;
    const prev = merchantMap.get(key) ?? { amount: 0, count: 0, txs: [] };
    merchantMap.set(key, {
      amount: prev.amount + Number(t.amount),
      count: prev.count + 1,
      txs: [...prev.txs, { date: t.date.toISOString(), description: t.description, amount: Number(t.amount) }],
    });
  }
  const topMerchants = Array.from(merchantMap.entries())
    .map(([merchant, { amount, count, txs }]) => ({
      merchant, amount, count,
      transactions: txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // ── Previous period (same duration, immediately before) ────────
  const durationMs = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(startDate.getTime() - durationMs - 1);
  prevStart.setHours(0, 0, 0, 0);

  const prevTxs = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: prevStart, lte: prevEnd },
    },
    select: { category: true, amount: true, type: true },
  });

  const prevIncome = prevTxs.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const prevExpense = prevTxs.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
  const prevNet = prevIncome - prevExpense;

  const prevCatMap = new Map<string, number>();
  for (const t of prevTxs) {
    if (t.type !== "EXPENSE") continue;
    prevCatMap.set(t.category, (prevCatMap.get(t.category) ?? 0) + Number(t.amount));
  }
  const prevCategoryBreakdown = Array.from(prevCatMap.entries())
    .map(([category, amount]) => ({
      category, amount,
      percentage: prevExpense > 0 ? Math.round((amount / prevExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const prevPeriod = prevTxs.length > 0 ? {
    totalIncome: prevIncome,
    totalExpense: prevExpense,
    net: prevNet,
    categoryBreakdown: prevCategoryBreakdown,
  } : null;

  // ── AI insight ─────────────────────────────────────────────────
  const aiInsight = await generateInsight(
    transactions.map(t => ({ category: t.category, amount: Number(t.amount), type: t.type, date: t.date })),
    startDate, endDate
  );

  return NextResponse.json({
    totalIncome, totalExpense, net, savingsRate,
    transactionCount: transactions.length,
    categoryBreakdown, aiInsight,
    heatmap, topMerchants, prevPeriod,
  });
}
