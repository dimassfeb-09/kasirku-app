import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { db } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const category = await db.category.findFirst({
    where: { id, organizationId: auth.ctx.session.organizationId },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ category });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "categories.edit");
  if (denied) return denied;

  const { id } = await params;

  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Nama kategori harus diisi" },
        { status: 400 }
      );
    }

    const existing = await db.category.findFirst({
      where: {
        organizationId: auth.ctx.session.organizationId,
        name,
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Nama kategori sudah digunakan" },
        { status: 409 }
      );
    }

    await db.category.updateMany({
      where: { id, organizationId: auth.ctx.session.organizationId },
      data: { name },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal mengupdate kategori" },
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

  const denied = requirePermission(auth.ctx, "categories.delete");
  if (denied) return denied;

  const { id } = await params;

  try {
    const productCount = await db.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        { error: `Tidak bisa hapus. Masih ada ${productCount} produk dalam kategori ini.` },
        { status: 400 }
      );
    }

    await db.category.deleteMany({
      where: { id, organizationId: auth.ctx.session.organizationId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus kategori" },
      { status: 500 }
    );
  }
}
