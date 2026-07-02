import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "products", action: "inventory" });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const inventory = await db.inventory.findMany({
    where: { productId: id },
    include: { store: { select: { id: true, name: true } } },
    orderBy: { store: { name: "asc" } },
  });

  return NextResponse.json({ inventory });
}

export async function POST(
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
    const { storeId, quantity } = body;

    if (!storeId || quantity === undefined) {
      return NextResponse.json(
        { error: "storeId dan quantity harus diisi" },
        { status: 400 }
      );
    }

    // Find existing inventory
    const existing = await db.inventory.findFirst({
      where: {
        productId: id,
        storeId,
        productVariantId: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Produk tidak di-assign ke toko ini" },
        { status: 404 }
      );
    }

    const oldQuantity = existing.quantity;
    const newQuantity = parseInt(quantity);
    const delta = newQuantity - oldQuantity;

    // Update inventory quantity
    await db.inventory.update({
      where: { id: existing.id },
      data: { quantity: newQuantity },
    });

    // Create audit trail
    if (delta !== 0) {
      await db.inventoryAdjustment.create({
        data: {
          inventoryId: existing.id,
          userId: auth.ctx.session.userId,
          quantity: delta,
          reason: delta > 0 ? "RESTOCK" : "CORRECTION",
          note: delta > 0 ? "Stok awal ditambahkan" : "Penyesuaian stok",
        },
      });
    }

    log.info({ productId: id, storeId, oldQuantity, newQuantity }, "Inventory updated");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Failed to update inventory");
    return NextResponse.json(
      { error: "Gagal mengupdate stok" },
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

  const denied = requirePermission(auth.ctx, "products.edit");
  if (denied) return denied;

  const { id } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId harus diisi" },
        { status: 400 }
      );
    }

    // Set quantity to 0 (soft unassign, keep record for history)
    await db.inventory.updateMany({
      where: {
        productId: id,
        storeId,
        productVariantId: null,
      },
      data: { quantity: 0 },
    });

    log.info({ productId: id, storeId }, "Product unassigned from store (qty set to 0)");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Failed to unassign product from store");
    return NextResponse.json(
      { error: "Gagal menghapus penugasan produk" },
      { status: 500 }
    );
  }
}
