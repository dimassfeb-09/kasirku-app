import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { db } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const categories = await db.category.findMany({
    where: { organizationId: auth.ctx.session.organizationId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "categories.create");
  if (denied) return denied;

  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Nama kategori harus diisi" },
        { status: 400 }
      );
    }

    const existing = await db.category.findFirst({
      where: { organizationId: auth.ctx.session.organizationId, name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Kategori sudah ada" },
        { status: 409 }
      );
    }

    const category = await db.category.create({
      data: {
        organizationId: auth.ctx.session.organizationId,
        name,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat kategori" },
      { status: 500 }
    );
  }
}
