import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "stores" });

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const stores = await db.store.findMany({
    where: { organizationId: auth.ctx.session.organizationId },
    include: {
      _count: { select: { orders: true, staffAssignments: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ stores });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "stores.create");
  if (denied) return denied;

  try {
    const body = await request.json();
    const { name, address, phone, currency, taxRate } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nama toko harus diisi" },
        { status: 400 }
      );
    }

    const store = await db.store.create({
      data: {
        organizationId: auth.ctx.session.organizationId,
        name,
        address: address || null,
        phone: phone || null,
        currency: currency || "IDR",
        taxRate: parseFloat(taxRate || "11"),
      },
    });

    return NextResponse.json({ store }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat toko" },
      { status: 500 }
    );
  }
}
