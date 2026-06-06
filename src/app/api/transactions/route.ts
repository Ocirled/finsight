import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  amount: z.number().positive(),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  description: z.string().min(1),
  merchant: z.string().optional(),
  date: z.string(),
  bankAccountId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const bankAccountId = searchParams.get("bankAccountId");
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where = {
      userId: session.user.id,
      ...(type && { type: type as "INCOME" | "EXPENSE" | "TRANSFER" }),
      ...(category && { category }),
      ...(bankAccountId && { bankAccountId }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: "insensitive" as const } },
          { merchant: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo + "T23:59:59") }),
            },
          }
        : {}),
    };

    const [transactions, total, summaryGroups] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          bankAccount: {
            select: { name: true, bankName: true },
          },
        },
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.groupBy({
        by: ["type"],
        where,
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(summaryGroups.find((g) => g.type === "INCOME")?._sum.amount ?? 0);
    const totalExpense = Number(summaryGroups.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0);
    const summary = { totalIncome, totalExpense, net: totalIncome - totalExpense };

    return NextResponse.json({ transactions, total, page, limit, summary });
  } catch (err) {
    // Without this, a transient failure (e.g. Neon cold-start) returns an empty
    // body and the client's res.json() throws "Unexpected end of JSON input".
    console.error("GET /api/transactions failed:", err);
    return NextResponse.json({ error: "Gagal memuat transaksi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        userId: session.user.id,
        date: new Date(data.date),
        amount: data.amount,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Data tidak valid", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
