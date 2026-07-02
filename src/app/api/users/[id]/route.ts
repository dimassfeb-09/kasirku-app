import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "users.view");
  if (denied) return denied;

  const { id } = await params;

  const user = await db.user.findFirst({
    where: { id, organizationId: auth.ctx.session.organizationId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      storeAssignments: {
        include: {
          store: { select: { id: true, name: true } },
        },
      },
      _count: { select: { orders: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "users.edit");
  if (denied) return denied;

  const { id } = await params;

  // Prevent editing own role
  if (id === auth.ctx.session.userId) {
    return NextResponse.json(
      { error: "Tidak bisa mengubah data sendiri" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { email, password, fullName, role, isActive, storeIds } = body;

    // Check email uniqueness if changed
    if (email) {
      const existing = await db.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Email sudah digunakan" },
          { status: 409 }
        );
      }
    }

    const updateData: any = {
      ...(email && { email }),
      ...(fullName && { fullName }),
      ...(role && { role }),
      ...(typeof isActive === "boolean" && { isActive }),
    };

    // Only hash password if provided
    if (password) {
      updateData.password = await hashPassword(password);
    }

    await db.user.update({
      where: { id },
      data: updateData,
    });

    // Update store assignments if provided
    if (storeIds !== undefined) {
      // Remove existing assignments
      await db.userStore.deleteMany({ where: { userId: id } });
      // Add new assignments
      if (storeIds.length > 0) {
        await db.userStore.createMany({
          data: storeIds.map((storeId: string) => ({
            userId: id,
            storeId,
          })),
        });
      }
    }

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        storeAssignments: {
          include: {
            store: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update user failed:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate pengguna" },
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

  const denied = requirePermission(auth.ctx, "users.delete");
  if (denied) return denied;

  const { id } = await params;

  // Prevent deleting self
  if (id === auth.ctx.session.userId) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus akun sendiri" },
      { status: 400 }
    );
  }

  try {
    // Soft delete - set isActive to false
    await db.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user failed:", error);
    return NextResponse.json(
      { error: "Gagal menghapus pengguna" },
      { status: 500 }
    );
  }
}
