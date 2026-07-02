import { NextResponse } from "next/server";
import { hashPassword, createSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "auth", action: "register" });

export async function POST(request: Request) {
  try {
    const { email, password, fullName, organizationName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, dan nama harus diisi" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const org = await db.organization.create({
      data: {
        name: organizationName || `${fullName}'s Store`,
        slug: email.split("@")[0],
      },
    });

    const user = await db.user.create({
      data: {
        organizationId: org.id,
        email,
        password: hashedPassword,
        fullName,
        role: "OWNER",
      },
    });

    const store = await db.store.create({
      data: {
        organizationId: org.id,
        name: "Toko Utama",
        currency: "IDR",
        taxRate: 11,
      },
    });

    await db.userStore.create({
      data: { userId: user.id, storeId: store.id },
    });

    await createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
