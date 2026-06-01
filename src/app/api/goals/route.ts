import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  targetAmount: z.number().positive(),
  deadline: z.string().optional(),
  emoji: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: [
      { status: "asc" }, // ACTIVE comes first alphabetically before CANCELLED/COMPLETED/PAUSED
      { createdAt: "desc" },
    ],
  });

  // Re-sort: ACTIVE → PAUSED → COMPLETED → CANCELLED
  const ORDER = { ACTIVE: 0, PAUSED: 1, COMPLETED: 2, CANCELLED: 3 };
  goals.sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));

  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const { title, description, targetAmount, deadline, emoji } = parsed.data;

  const goal = await prisma.goal.create({
    data: {
      userId: session.user.id,
      title,
      description,
      targetAmount,
      deadline: deadline ? new Date(deadline) : null,
      emoji: emoji ?? "🎯",
      status: "ACTIVE",
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
