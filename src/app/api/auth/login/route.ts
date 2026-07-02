import { NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "auth", action: "login" });

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      log.warn("Login attempt with missing fields");
      return NextResponse.json(
        { error: "Email dan password harus diisi" },
        { status: 400 }
      );
    }

    log.info({ email }, "Login attempt");
    const result = await loginUser(email, password);

    if ("error" in result) {
      log.warn({ email, error: result.error }, "Login failed");
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    log.info({ userId: result.user.id, email, role: result.user.role }, "Login successful");
    return NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
        organizationId: result.user.organizationId,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Login error");
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
