import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import { db } from "./prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "kasirku-super-secret-key-change-in-production"
);

const COOKIE_NAME = "kasirku-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: {
  id: string;
  email: string;
  role: string;
  organizationId: string;
}) {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function loginUser(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email },
    include: { organization: true },
  });

  if (!user) return { error: "Email atau password salah" };
  if (!user.isActive) return { error: "Akun tidak aktif" };

  const valid = await verifyPassword(password, (user as any).password);
  if (!valid) return { error: "Email atau password salah" };

  const session = await createSession({
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  });

  return { user, session };
}
