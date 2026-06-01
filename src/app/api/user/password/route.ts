import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password minimal 8 karakter"),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password)
    return NextResponse.json({ error: "Akun tidak memiliki password" }, { status: 400 });

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!isValid)
    return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } });

  await logAudit(session.user.id, "PASSWORD_CHANGED", "user", req);

  return NextResponse.json({ ok: true });
}
