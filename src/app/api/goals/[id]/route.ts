import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  targetAmount: z.number().positive().optional(),
  addAmount: z.number().min(0).optional(),   // increments savedAmount
  savedAmount: z.number().min(0).optional(), // set directly (for edit)
  deadline: z.string().nullable().optional(),
  emoji: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal || goal.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const { addAmount, savedAmount, deadline, ...rest } = parsed.data;

  const newSavedAmount =
    addAmount !== undefined
      ? Number(goal.savedAmount) + addAmount
      : savedAmount !== undefined
      ? savedAmount
      : undefined;

  const updated = await prisma.goal.update({
    where: { id },
    data: {
      ...rest,
      ...(newSavedAmount !== undefined && { savedAmount: newSavedAmount }),
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal || goal.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
