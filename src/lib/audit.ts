import { prisma } from "./db";
import { NextRequest } from "next/server";

export async function logAudit(
  userId: string,
  action: string,
  resource: string,
  req?: NextRequest,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        ipAddress:
          req?.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
          req?.headers.get("x-real-ip") ??
          null,
        userAgent: req?.headers.get("user-agent") ?? null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  } catch {
    // Audit log failure must never break the main flow
  }
}
