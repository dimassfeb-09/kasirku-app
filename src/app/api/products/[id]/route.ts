import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "products" });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const product = await db.product.findFirst({
    where: { id, organizationId: auth.ctx.session.organizationId },
    include: {
      category: true,
      inventory: {
        include: { store: { select: { id: true, name: true } } },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "products.edit");
  if (denied) return denied;

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, sku, barcode, description, price, cost, categoryId, storeAssignmentStoreIds } = body;

    await db.product.updateMany({
      where: { id, organizationId: auth.ctx.session.organizationId },
      data: {
        name,
        sku: sku || null,
        barcode: barcode || null,
        description: description || null,
        price: parseFloat(price),
        cost: parseFloat(cost || "0"),
        categoryId: categoryId || null,
      },
    });

    // Sync inventory assignments
    if (storeAssignmentStoreIds !== undefined) {
      const existing = await db.inventory.findMany({
        where: { productId: id },
        select: { storeId: true },
      });
      const existingStoreIds = existing.map((e) => e.storeId);

      // Unassign: set qty=0 (keep record for history)
      const toUnassign = existingStoreIds.filter(
        (sid) => !storeAssignmentStoreIds.includes(sid)
      );
      if (toUnassign.length) {
        await db.inventory.updateMany({
          where: { productId: id, storeId: { in: toUnassign } },
          data: { quantity: 0 },
        });
      }

      // Assign: create new inventory records
      const toAssign = storeAssignmentStoreIds.filter(
        (sid: string) => !existingStoreIds.includes(sid)
      );
      if (toAssign.length) {
        await db.inventory.createMany({
          data: toAssign.map((storeId: string) => ({
            storeId,
            productId: id,
            quantity: 0,
            lowStockThreshold: 10,
          })),
        });
      }
    }

    log.info({ productId: id }, "Product updated");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Failed to update product");
    return NextResponse.json(
      { error: "Gagal mengupdate produk" },
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

  const denied = requirePermission(auth.ctx, "products.delete");
  if (denied) return denied;

  const { id } = await params;

  try {
    await db.product.updateMany({
      where: { id, organizationId: auth.ctx.session.organizationId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus produk" },
      { status: 500 }
    );
  }
}
