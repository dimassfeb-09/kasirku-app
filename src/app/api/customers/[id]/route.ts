import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "customers" });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const customer = await db.customer.findFirst({
    where: { id, organizationId: auth.ctx.session.organizationId },
    include: {
      orders: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { items: true },
      },
    },
  });

  if (!customer) {
    return NextResponse.json(
      { error: "Pelanggan tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json({ customer });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "customers.edit");
  if (denied) return denied;

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, phone, email, notes } = body;

    const customer = await db.customer.updateMany({
      where: { id, organizationId: auth.ctx.session.organizationId },
      data: {
        name,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json(
      { error: "Gagal mengupdate pelanggan" },
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

  const denied = requirePermission(auth.ctx, "customers.delete");
  if (denied) return denied;

  const { id } = await params;

  try {
    await db.customer.deleteMany({
      where: { id, organizationId: auth.ctx.session.organizationId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus pelanggan" },
      { status: 500 }
    );
  }
}
