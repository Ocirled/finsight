import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateInsight, type InsightContext } from "@/lib/ai";

// Thin AI wrapper. The heavy computation lives in /api/insights; the client
// posts back the already-computed summary so the page can render findings
// instantly and stream the AI narrative in asynchronously (Fase C of PLAN.md).
// Nothing here is trusted for authorization — the payload only builds a prompt.

function parseDateParam(v: unknown): Date {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body || Number(body.transactionCount) === 0) {
      return NextResponse.json({ insight: null });
    }

    const ctx: InsightContext = {
      start: parseDateParam(body.start),
      end: parseDateParam(body.end),
      totalIncome: Number(body.totalIncome) || 0,
      totalExpense: Number(body.totalExpense) || 0,
      net: Number(body.net) || 0,
      savingsRate: Number(body.savingsRate) || 0,
      transactionCount: Number(body.transactionCount) || 0,
      categoryBreakdown: Array.isArray(body.categoryBreakdown) ? body.categoryBreakdown : [],
      prevPeriod: body.prevPeriod ?? null,
      topMerchants: Array.isArray(body.topMerchants) ? body.topMerchants : [],
      findings: Array.isArray(body.findings) ? body.findings : [],
    };

    const insight = await generateInsight(ctx);
    return NextResponse.json({ insight });
  } catch {
    return NextResponse.json({ insight: null });
  }
}
