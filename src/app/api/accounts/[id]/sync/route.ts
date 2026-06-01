import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSimulatedTransactions } from "@/lib/simulator";
import { startOfDay, startOfMonth } from "date-fns";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const account = await prisma.bankAccount.findFirst({
    where: { id, userId: session.user.id, isActive: true },
  });
  if (!account) return NextResponse.json({ error: "Rekening tidak ditemukan" }, { status: 404 });
  if (!account.isSimulated) return NextResponse.json({ error: "Rekening ini bukan simulator" }, { status: 400 });

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Only generate data for the current month
  const currentMonthStart = startOfDay(startOfMonth(today));

  // Find the latest transaction date for this account
  const latest = await prisma.transaction.findFirst({
    where: { bankAccountId: id },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  let fromDate: Date;
  if (!latest) {
    fromDate = currentMonthStart;
  } else {
    fromDate = startOfDay(new Date(latest.date));
    fromDate.setDate(fromDate.getDate() + 1);
  }

  // Clamp to current month start — never generate data before this month
  if (fromDate < currentMonthStart) fromDate = currentMonthStart;

  if (fromDate > today) {
    await prisma.bankAccount.update({
      where: { id },
      data: { lastSyncedAt: new Date() },
    });
    return NextResponse.json({ inserted: 0, message: "Sudah sinkron" });
  }

  const transactions = generateSimulatedTransactions(
    account.bankName,
    account.accountType,
    fromDate,
    today,
    session.user.id,
    id
  );

  if (transactions.length > 0) {
    await prisma.transaction.createMany({ data: transactions });
  }

  await prisma.bankAccount.update({
    where: { id },
    data: { lastSyncedAt: new Date() },
  });

  return NextResponse.json({ inserted: transactions.length });
}
