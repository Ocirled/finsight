import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

function generateCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const hex = randomBytes(5).toString("hex").toUpperCase();
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
}

/** GET — returns remaining backup code count (not the codes themselves) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { backupCodes: true, twoFactorEnabled: true },
  });

  if (!user?.twoFactorEnabled)
    return NextResponse.json({ error: "2FA belum aktif" }, { status: 400 });

  return NextResponse.json({ remaining: user.backupCodes.length });
}

/** POST — generate (or regenerate) backup codes */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true },
  });

  if (!user?.twoFactorEnabled)
    return NextResponse.json({ error: "2FA belum aktif" }, { status: 400 });

  const plainCodes = generateCodes(10);
  const hashed = await Promise.all(plainCodes.map((c) => bcrypt.hash(c, 10)));

  await prisma.user.update({
    where: { id: session.user.id },
    data: { backupCodes: hashed },
  });

  await logAudit(session.user.id, "BACKUP_CODES_GENERATED", "auth", req);

  return NextResponse.json({ codes: plainCodes });
}
