import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "users" });

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "users.view");
  if (denied) return denied;

  const users = await db.user.findMany({
    where: { organizationId: auth.ctx.session.organizationId },
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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "users.create");
  if (denied) return denied;

  try {
    const body = await request.json();
    const { email, password, fullName, role, storeIds } = body;

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "Email, password, nama lengkap, dan role harus diisi" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      log.warn({ email }, "Email already exists");
      return NextResponse.json(
        { error: "Email sudah digunakan" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    log.info({ email, role, storeIds }, "Creating user");
    const user = await db.user.create({
      data: {
        organizationId: auth.ctx.session.organizationId,
        email,
        password: hashedPassword,
        fullName,
        role,
        storeAssignments: storeIds?.length
          ? {
              create: storeIds.map((storeId: string) => ({ storeId })),
            }
          : undefined,
      },
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
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Create user failed:", error);
    return NextResponse.json(
      { error: "Gagal membuat pengguna" },
      { status: 500 }
    );
  }
}
