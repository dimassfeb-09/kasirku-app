import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "products" });

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId");
  const storeId = searchParams.get("storeId");

  const products = await db.product.findMany({
    where: {
      organizationId: auth.ctx.session.organizationId,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
          { barcode: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(storeId && {
        inventory: { some: { storeId } },
      }),
    },
    include: {
      category: true,
      inventory: {
        include: { store: { select: { id: true, name: true } } },
        ...(storeId && { where: { storeId } }),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "products.create");
  if (denied) return denied;

  try {
    const body = await request.json();
    const { name, sku, barcode, description, price, cost, categoryId, storeAssignmentStoreIds } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "Nama dan harga harus diisi" },
        { status: 400 }
      );
    }

    log.info({ name, price, userId: auth.ctx.session.userId }, "Creating product");
    const product = await db.product.create({
      data: {
        organizationId: auth.ctx.session.organizationId,
        name,
        sku: sku || null,
        barcode: barcode || null,
        description: description || null,
        price: parseFloat(price),
        cost: parseFloat(cost || "0"),
        categoryId: categoryId || null,
      },
    });

    // Create inventory records for assigned stores (default qty 0)
    if (storeAssignmentStoreIds?.length) {
      await db.inventory.createMany({
        data: storeAssignmentStoreIds.map((storeId: string) => ({
          storeId,
          productId: product.id,
          quantity: 0,
          lowStockThreshold: 10,
        })),
      });
      log.info({ productId: product.id, storeCount: storeAssignmentStoreIds.length }, "Inventory created for assigned stores");
    }

    log.info({ productId: product.id, name }, "Product created");
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, "Failed to create product");
    return NextResponse.json(
      { error: "Gagal membuat produk" },
      { status: 500 }
    );
  }
}
