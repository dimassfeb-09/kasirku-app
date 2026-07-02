import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "auth", action: "logout" });

export async function POST() {
  await deleteSession();
  return NextResponse.json({ success: true });
}
