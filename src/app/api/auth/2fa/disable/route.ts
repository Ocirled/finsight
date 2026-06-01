import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { verifySync } from "otplib";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { otp } = await req.json();
  if (!otp) return NextResponse.json({ error: "Kode OTP diperlukan" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.twoFactorSecret || !user.twoFactorEnabled)
    return NextResponse.json({ error: "2FA tidak aktif" }, { status: 400 });

  const { valid: isValid } = verifySync({ token: otp, secret: user.twoFactorSecret });
  if (!isValid)
    return NextResponse.json({ error: "Kode OTP salah atau kadaluarsa" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, backupCodes: [] },
  });

  await logAudit(session.user.id, "2FA_DISABLED", "auth", req);

  return NextResponse.json({ ok: true });
}
