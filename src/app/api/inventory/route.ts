import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "inventory" });

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const lowStock = searchParams.get("lowStock") === "true";
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const sort = searchParams.get("sort") || "name";

  try {
    const where: Record<string, unknown> = {
      organizationId: auth.ctx.session.organizationId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const products = await db.product.findMany({
      where,
      include: {
        inventory: {
          include: { store: { select: { id: true, name: true } } },
          orderBy: { store: { name: "asc" } },
        },
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    // Filter low stock: products where any store has quantity <= lowStockThreshold
    let filtered = lowStock
      ? products.filter((p) =>
          p.inventory.some((inv) => inv.quantity <= inv.lowStockThreshold)
        )
      : products;

    // Sort by total stock or name
    if (sort === "stock_desc") {
      filtered = [...filtered].sort((a, b) => {
        const totalA = a.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        const totalB = b.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        return totalB - totalA;
      });
    } else if (sort === "stock_asc") {
      filtered = [...filtered].sort((a, b) => {
        const totalA = a.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        const totalB = b.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        return totalA - totalB;
      });
    } else {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    log.info({ count: filtered.length, lowStock, sort, categoryId }, "Inventory list fetched");
    return NextResponse.json({ products: filtered });
  } catch (error) {
    log.error({ err: error }, "Failed to fetch inventory");
    return NextResponse.json(
      { error: "Gagal memuat data persediaan" },
      { status: 500 }
    );
  }
}
