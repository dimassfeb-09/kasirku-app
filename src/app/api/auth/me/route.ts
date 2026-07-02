import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "auth", action: "me" });

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      organizationId: true,
    },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}
