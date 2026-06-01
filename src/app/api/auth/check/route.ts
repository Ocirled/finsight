import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// Pre-flight check: is the password valid, and does this account need 2FA?
// Used by the login page to show the OTP step before calling NextAuth signIn.
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password)
    return NextResponse.json({ valid: false });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid)
    return NextResponse.json({ valid: false });

  return NextResponse.json({
    valid: true,
    requiresTwoFactor: user.twoFactorEnabled,
  });
}
