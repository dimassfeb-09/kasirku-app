import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
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

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const where: any = {
    store: { organizationId: auth.ctx.session.organizationId },
  };

  // CASHIER can only see their own orders
  if (auth.ctx.userRole === "CASHIER") {
    where.userId = auth.ctx.session.userId;
  }

  if (storeId) {
    where.storeId = storeId;
  }

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        items: true,
        payments: true,
        customer: true,
        store: true,
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.order.count({ where }),
  ]);

  return NextResponse.json({ orders: orders.map(serializeOrder), total, page, limit });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "pos.use");
  if (denied) return denied;

  try {
    const body = await request.json();
    const { storeId, customerId, items, paymentMethod, paymentAmount, notes } = body;

    if (!storeId || !items?.length || !paymentMethod) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Check stock availability before creating order
    for (const item of items) {
      const inventory = await db.inventory.findFirst({
        where: {
          storeId,
          productId: item.productId,
          productVariantId: null,
        },
      });

      if (!inventory) {
        return NextResponse.json(
          { error: `Produk ${item.name} tidak tersedia di toko ini` },
          { status: 400 }
        );
      }

      if (inventory.quantity < item.quantity) {
        return NextResponse.json(
          { error: `Stok ${item.name} tidak cukup (tersisa ${inventory.quantity})` },
          { status: 400 }
        );
      }
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.price * item.quantity;
    }

    const store = await db.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ error: "Toko tidak ditemukan" }, { status: 404 });
    }

    const taxAmount = subtotal * (Number(store.taxRate) / 100);
    const total = subtotal + taxAmount;

    // Generate unique order number using timestamp + random
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const orderNumber = `INV-${dateStr}-${timeStr}-${randomSuffix}`;

    // Create order with items and payment
    const order = await db.order.create({
      data: {
        orderNumber,
        storeId,
        customerId: customerId || null,
        userId: auth.ctx.session.userId,
        subtotal,
        taxAmount,
        discountAmount: 0,
        total,
        notes,
        status: "COMPLETED",
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            discountAmount: 0,
            total: item.price * item.quantity,
          })),
        },
        payments: {
          create: {
            method: paymentMethod,
            amount: paymentAmount || total,
            reference: null,
          },
        },
      },
      include: {
        items: true,
        payments: true,
        store: true,
        user: { select: { id: true, fullName: true } },
        customer: true,
      },
    });

    // Deduct stock and create audit trail
    for (const item of items) {
      const inventory = await db.inventory.findFirst({
        where: {
          storeId,
          productId: item.productId,
          productVariantId: null,
        },
      });

      if (inventory) {
        await db.inventory.update({
          where: { id: inventory.id },
          data: { quantity: { decrement: item.quantity } },
        });

        await db.inventoryAdjustment.create({
          data: {
            inventoryId: inventory.id,
            userId: auth.ctx.session.userId,
            quantity: -item.quantity,
            reason: "SALE",
            note: `Order ${orderNumber}`,
          },
        });
      }
    }

    log.info({ orderId: order.id, orderNumber, storeId, total }, "Order created");
    return NextResponse.json({ order: serializeOrder(order) }, { status: 201 });
  } catch (error: any) {
    log.error({ err: error }, "Order creation failed");
    return NextResponse.json(
      { error: error?.message || "Gagal membuat pesanan" },
      { status: 500 }
    );
  }
}
