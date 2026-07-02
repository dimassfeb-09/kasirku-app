import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "orders" });

function serializeOrder(order: any) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    taxAmount: Number(order.taxAmount),
    discountAmount: Number(order.discountAmount),
    total: Number(order.total),
    items: order.items.map((item: any) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      discountAmount: Number(item.discountAmount),
      total: Number(item.total),
    })),
    payments: order.payments.map((p: any) => ({
      ...p,
      amount: Number(p.amount),
    })),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const where: any = {
    id,
    store: { organizationId: session.organizationId },
  };

  // CASHIER can only see their own orders
  if (session.role === "CASHIER") {
    where.userId = session.userId;
  }

  const order = await db.order.findFirst({
    where,
    include: {
      items: true,
      payments: true,
      customer: true,
      store: true,
      user: { select: { id: true, fullName: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ order: serializeOrder(order) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const where: any = {
    id,
    store: { organizationId: session.organizationId },
  };

  // CASHIER can only update their own orders
  if (session.role === "CASHIER") {
    where.userId = session.userId;
  }

  const order = await db.order.findFirst({ where });

  if (!order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
  }

  const updated = await db.order.update({
    where: { id },
    data: { status: body.status, notes: body.notes },
    include: {
      items: true,
      payments: true,
      customer: true,
      store: true,
      user: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json({ order: serializeOrder(updated) });
}
