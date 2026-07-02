import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "user-stores" });

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  let stores: { id: string; name: string; currency: string }[] = [];

  if (user.role === "OWNER") {
    // Owner sees all stores in the org
    stores = await db.store.findMany({
      where: { organizationId: session.organizationId, isActive: true },
      select: { id: true, name: true, currency: true },
      orderBy: { name: "asc" },
    });
  } else {
    // Manager and Cashier only see assigned stores
    const assignments = await db.userStore.findMany({
      where: { userId: session.userId },
      include: {
        store: {
          select: { id: true, name: true, currency: true, isActive: true },
        },
      },
    });
    stores = assignments
      .filter((a) => a.store.isActive)
      .map((a) => a.store);
  }

  return NextResponse.json({ stores, role: user.role });
}
