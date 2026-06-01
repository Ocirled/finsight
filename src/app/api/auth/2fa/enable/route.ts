import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { verifySync } from "otplib";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

function generateCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const hex = randomBytes(5).toString("hex").toUpperCase();
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { otp } = await req.json();
  if (!otp) return NextResponse.json({ error: "Kode OTP diperlukan" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.twoFactorSecret)
    return NextResponse.json({ error: "Setup 2FA belum dimulai" }, { status: 400 });

  const { valid: isValid } = verifySync({ token: otp, secret: user.twoFactorSecret });
  if (!isValid)
    return NextResponse.json({ error: "Kode OTP salah atau kadaluarsa" }, { status: 400 });

  const plainCodes = generateCodes(10);
  const hashed = await Promise.all(plainCodes.map((c) => bcrypt.hash(c, 10)));

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: true, backupCodes: hashed },
  });

  await logAudit(session.user.id, "2FA_ENABLED", "auth", req);

  return NextResponse.json({ ok: true, backupCodes: plainCodes });
}
