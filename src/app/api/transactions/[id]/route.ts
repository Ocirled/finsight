import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  category: z.string().min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const transaction = await prisma.transaction.findUnique({ where: { id } });

  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { category } = patchSchema.parse(body);

    const updated = await prisma.transaction.update({
      where: { id },
      data: { category, aiCategorized: false },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const transaction = await prisma.transaction.findUnique({ where: { id } });

  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
