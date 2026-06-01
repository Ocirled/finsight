import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });

  if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  if (user.emailVerified)
    return NextResponse.json({ error: "Email sudah diverifikasi" }, { status: 400 });

  // Delete any existing token for this email
  await prisma.verificationToken.deleteMany({ where: { identifier: user.email } });

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.verificationToken.create({
    data: { identifier: user.email, token, expires },
  });

  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}&identifier=${encodeURIComponent(user.email)}`;

  await logAudit(session.user.id, "EMAIL_VERIFICATION_SENT", "auth", req, { email: user.email });

  // In production, send via SMTP — configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
  // For now, log the URL and return it in dev mode so it can be tested
  if (process.env.NODE_ENV !== "production") {
    console.log("\n📧 [DEV] Email verification link:", verifyUrl, "\n");
    return NextResponse.json({ ok: true, devUrl: verifyUrl });
  }

  return NextResponse.json({ ok: true });
}
