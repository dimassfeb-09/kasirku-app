import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { db } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const limit = parseInt(searchParams.get("limit") || "100");

  const customers = await db.customer.findMany({
    where: {
      organizationId: auth.ctx.session.organizationId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ customers });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const denied = requirePermission(auth.ctx, "customers.create");
  if (denied) return denied;

  try {
    const body = await request.json();
    const { name, phone, email, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nama harus diisi" },
        { status: 400 }
      );
    }

    const customer = await db.customer.create({
      data: {
        organizationId: auth.ctx.session.organizationId,
        name,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat pelanggan" },
      { status: 500 }
    );
  }
}
