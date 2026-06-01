import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const identifier = searchParams.get("identifier");

  if (!token || !identifier) {
    return NextResponse.redirect(new URL("/security?verified=invalid", req.url));
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.identifier !== identifier || record.expires < new Date()) {
    return NextResponse.redirect(new URL("/security?verified=expired", req.url));
  }

  const user = await prisma.user.findUnique({ where: { email: identifier } });
  if (!user) {
    return NextResponse.redirect(new URL("/security?verified=invalid", req.url));
  }

  await Promise.all([
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.delete({ where: { token } }),
    prisma.auditLog.create({
      data: { userId: user.id, action: "EMAIL_VERIFIED", resource: "auth" },
    }),
  ]);

  return NextResponse.redirect(new URL("/security?verified=ok", req.url));
}
