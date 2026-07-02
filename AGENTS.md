# AGENTS.md

## Commands

```bash
bun run dev              # Start dev server
bun run build            # Production build
bun run start            # Start production server
bun run lint             # ESLint (flat config, w/ TypeScript rules)
bun run db:migrate       # Run Prisma migrations (also generates client)
bun run db:migrate:prod  # Deploy migrations (CI/prod)
bun run db:seed          # Seed demo data
bun run db:studio        # Open Prisma Studio
bun run db:reset         # Reset database and re-run migrations
```

Use `bun` (not npm/yarn/pnpm). No test framework is configured.

## Docker

```bash
docker compose up -d            # Start dev (db + app with hot reload)
docker compose run seed         # Seed demo data (one-time, `restart: "no"`)
docker compose down -v          # Stop & cleanup volumes

# Production
POSTGRES_PASSWORD=secret JWT_SECRET=secret docker compose -f docker-compose.prod.yml up -d
```

- `docker-compose.yml` — local dev: PostgreSQL 16 on port **5434** + Next.js with hot reload + seed service
- `docker-compose.prod.yml` — production: PostgreSQL on port **5431**, secrets via env vars
- `Dockerfile` — multi-stage: deps → build (prisma generate) → slim runner

## Gotchas

- **Database port is 5434** in dev (`.env` + `docker-compose.yml`), 5431 in prod compose — don't confuse them
- **Prisma client output** is in `src/generated/prisma` and is **gitignored** — run `bun run db:migrate` to regenerate after schema changes. Import from `@/generated/prisma`, never from `@prisma/client`.
- **Prisma uses `PrismaPg` adapter** (`@prisma/adapter-pg`), not the default driver — see `src/lib/prisma.ts`
- **Root layout** sets `export const dynamic = "force-dynamic"` — all pages are server-rendered at request time
- **API error messages are in Indonesian** (e.g., "Email atau password salah", "Akses ditolak")
- **Store context** is client-side via localStorage key `kasirku-current-store` — don't hardcode store IDs
- **Seed credentials**: `admin@kasirku.app` / `password123` (OWNER), `cashier@kasirku.app` / `password123` (CASHIER)

## Architecture

**Multi-tenant POS app.** `Organization` is the tenant boundary. All data queries must filter by `organizationId` from the session.

### Route structure

- `(authenticated)/` — route group whose layout checks session server-side and wraps children in `StoreProvider`
- `login/`, `register/` — public pages
- `api/auth/` — login, register, me, logout (excluded from middleware protection)
- `api/` other routes — protected, use `requireAuth()` + `requirePermission()`

### Auth flow

- JWT stored in cookie `kasirku-session` (7-day expiry, jose library)
- Middleware (`src/middleware.ts`) protects all routes except `/login`, `/register`, `/api/auth` — excludes static assets via `config.matcher`
- API routes use `requireAuth()` + `requirePermission()` from `src/lib/api-auth.ts`
- Session payload: `userId`, `email`, `role`, `organizationId`

### Roles & permissions

`OWNER` → full access. `MANAGER` → no user/store create/delete. `CASHIER` → POS + own orders/reports only. See `src/lib/permissions.ts`.

### API route patterns

```typescript
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { db } from "@/lib/prisma";

// Next.js 16: params is a Promise — await it
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  // auth.ctx.session.organizationId for tenant scoping
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const denied = requirePermission(auth.ctx, "products.create");
  if (denied) return denied;
}
```

- **CASHIER row filtering**: orders/reports queries check `auth.ctx.userRole === "CASHIER"` and scope to `userId` — see `src/app/api/orders/route.ts:43`
- **Soft delete**: products use `isActive: false` instead of actual row deletion
- **Decimal serialization**: `Decimal` fields must be `Number(...)` cast before JSON response (Prisma returns them as strings)

### Key lib files

| File | Purpose |
|------|---------|
| `src/lib/prisma.ts` | Singleton Prisma client with PrismaPg adapter |
| `src/lib/auth.ts` | JWT session management, login/logout |
| `src/lib/api-auth.ts` | `requireAuth()`, `requirePermission()` for API routes |
| `src/lib/permissions.ts` | Role-based permission matrix |
| `src/lib/store-context.tsx` | Client-side store selection (React context + localStorage) |
| `src/lib/logger.ts` | Pino logger — use `const log = createLogger({ module: "name" })` or `logger.child(...)` |

### UI stack

Shadcn (radix-nova style, `components.json` confirms) + Tailwind v4 + Lucide icons. Components in `src/components/ui/`. Add new ones via `npx shadcn@latest add <component>`.

### Load testing

`load-test/` directory contains k6 scripts (smoke test, stress test, heavy spike). See `load-test/README.md` for usage — requires `kasirku-session` cookie value.

### Path alias

`@/*` → `./src/*`
