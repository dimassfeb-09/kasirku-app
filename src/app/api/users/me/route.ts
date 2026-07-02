import { NextResponse } from "next/server";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "users", action: "me" });

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      organization: { select: { name: true } },
      storeAssignments: {
        include: { store: { select: { id: true, name: true } } },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fullName, email, currentPassword, newPassword } = body;

    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Nama dan email harus diisi" },
        { status: 400 }
      );
    }

    // Check email uniqueness if changed
    if (email) {
      const existing = await db.user.findFirst({
        where: { email, NOT: { id: session.userId } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Email sudah digunakan" },
          { status: 409 }
        );
      }
    }

    const updateData: any = {
      fullName,
      email,
    };

    // Only update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Password lama harus diisi" },
          { status: 400 }
        );
      }

      const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { password: true },
      });

      if (!user || !(await verifyPassword(currentPassword, (user as any).password))) {
        return NextResponse.json(
          { error: "Password lama salah" },
          { status: 400 }
        );
      }

      updateData.password = await hashPassword(newPassword);
    }

    log.info({ userId: session.userId }, "Updating profile");
    const updated = await db.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    log.info({ userId: session.userId }, "Profile updated");
    return NextResponse.json({ user: updated });
  } catch (error) {
    log.error({ err: error }, "Failed to update profile");
    return NextResponse.json(
      { error: "Gagal mengupdate profil" },
      { status: 500 }
    );
  }
}
