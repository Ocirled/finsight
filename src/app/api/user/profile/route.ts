import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, emailVerified: true, twoFactorEnabled: true, createdAt: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  if (parsed.data.email) {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing && existing.id !== session.user.id)
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...parsed.data,
      // Reset emailVerified if email changed
      ...(parsed.data.email ? { emailVerified: null } : {}),
    },
    select: { id: true, name: true, email: true },
  });

  await logAudit(session.user.id, "PROFILE_UPDATED", "user", req, {
    fields: Object.keys(parsed.data),
  });

  return NextResponse.json(updated);
}
