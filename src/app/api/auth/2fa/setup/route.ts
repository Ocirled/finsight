import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = generateSecret();
  const uri = generateURI({ issuer: "FinSight", label: session.user.email!, secret });
  const qrCode = await QRCode.toDataURL(uri);

  // Save secret now (unconfirmed); twoFactorEnabled stays false until verified
  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorSecret: secret },
  });

  return NextResponse.json({ qrCode, secret });
}
