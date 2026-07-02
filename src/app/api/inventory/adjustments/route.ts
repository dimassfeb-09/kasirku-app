import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "inventory", action: "adjustments" });

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const storeId = searchParams.get("storeId");
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    const where: Record<string, unknown> = {
      inventory: {
        product: { organizationId: auth.ctx.session.organizationId },
      },
    };

    if (productId) {
      where.inventory = {
        ...where.inventory as Record<string, unknown>,
        productId,
      };
    }

    if (storeId) {
      where.inventory = {
        ...where.inventory as Record<string, unknown>,
        storeId,
      };
    }

    const adjustments = await db.inventoryAdjustment.findMany({
      where,
      include: {
        inventory: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            store: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });

    log.info({ count: adjustments.length }, "Adjustments fetched");
    return NextResponse.json({ adjustments });
  } catch (error) {
    log.error({ err: error }, "Failed to fetch adjustments");
    return NextResponse.json(
      { error: "Gagal memuat riwayat penyesuaian" },
      { status: 500 }
    );
  }
}
