import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "stores" });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const store = await db.store.findFirst({
    where: { id, organizationId: auth.ctx.session.organizationId },
    include: {
      staffAssignments: {
        include: { user: { select: { id: true, email: true, fullName: true, role: true } } },
      },
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Toko tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ store });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "stores.edit");
  if (denied) return denied;

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, address, phone, currency, taxRate, receiptHeader, receiptFooter } = body;

    const store = await db.store.updateMany({
      where: { id, organizationId: auth.ctx.session.organizationId },
      data: {
        name,
        address: address || null,
        phone: phone || null,
        currency: currency || "IDR",
        taxRate: parseFloat(taxRate || "11"),
        receiptHeader: receiptHeader || null,
        receiptFooter: receiptFooter || null,
      },
    });

    return NextResponse.json({ store });
  } catch {
    return NextResponse.json(
      { error: "Gagal mengupdate toko" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "stores.delete");
  if (denied) return denied;

  const { id } = await params;

  try {
    await db.store.updateMany({
      where: { id, organizationId: auth.ctx.session.organizationId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus toko" },
      { status: 500 }
    );
  }
}
