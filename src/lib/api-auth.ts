import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";
import { hasPermission, type Role, type Permission } from "@/lib/permissions";
import { logger } from "@/lib/logger";

export interface AuthContext {
  session: SessionPayload;
  userRole: Role;
}

export async function requireAuth(): Promise<
  { error: NextResponse } | { ctx: AuthContext }
> {
  const session = await getSession();
  if (!session) {
    logger.warn("Authentication failed - no session");
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  logger.debug({ userId: session.userId, role: session.role }, "User authenticated");
  return {
    ctx: {
      session,
      userRole: session.role as Role,
    },
  };
}

export function requirePermission(
  ctx: AuthContext,
  permission: Permission
): NextResponse | null {
  if (!hasPermission(ctx.userRole, permission)) {
    logger.warn({ userId: ctx.session.userId, role: ctx.userRole, permission }, "Permission denied");
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  return null;
}


