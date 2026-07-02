# AGENTS.md

## Commands

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run lint         # ESLint
bun run db:migrate   # Run Prisma migrations (also generates client)
bun run db:seed      # Seed demo data
bun run db:studio    # Open Prisma Studio
```

No test framework is configured. There are no test scripts in package.json.

## Docker

```bash
docker compose up -d          # Start dev (db + app with hot reload)
docker compose run seed       # Seed demo data (one-time)
docker compose down -v        # Stop & cleanup volumes

# Production
POSTGRES_PASSWORD=secret JWT_SECRET=secret docker compose -f docker-compose.prod.yml up -d
```

- `docker-compose.yml` — local dev: PostgreSQL 16 on port 5431 + Next.js with hot reload + seed service
- `docker-compose.prod.yml` — production: PostgreSQL + built app, secrets via env vars
- `Dockerfile` — multi-stage: deps → build (prisma generate) → slim runner
- Seed service runs once then exits (`restart: "no"`)

## Gotchas

- **Database port is 5431**, not the default 5432 (see `.env`)
- **Prisma client output** is in `src/generated/prisma` and is **gitignored** — run `bun run db:migrate` to regenerate after schema changes. Import from `@/generated/prisma`, never from `@prisma/client`.
- **Prisma uses `PrismaPg` adapter** (`@prisma/adapter-pg`), not the default driver — see `src/lib/prisma.ts`
- **Next.js 16** has breaking changes vs earlier versions — check `node_modules/next/dist/docs/` before writing new code
- **Root layout** sets `export const dynamic = "force-dynamic"` — all pages are server-rendered at request time
- **API error messages are in Indonesian** (e.g., "Email atau password salah", "Akses ditolak") — keep responses consistent
- **Store context** is client-side via localStorage key `kasirku-current-store` — don't hardcode store IDs

## Architecture

**Multi-tenant POS app.** `Organization` is the tenant boundary. All data queries must filter by `organizationId` from the session.

### Route structure

- `(authenticated)/` — route group with its own `layout.tsx` that checks session server-side and wraps children in `StoreProvider`
- `login/`, `register/` — public pages
- `api/auth/` — login, register, me, logout (excluded from middleware protection)
- `api/` other routes — protected, use `requireAuth()` + `requirePermission()`

### Auth flow

- JWT stored in cookie `kasirku-session` (7-day expiry, jose library)
- Middleware (`src/middleware.ts`) protects all routes except `/login`, `/register`, `/api/auth`
- API routes use `requireAuth()` + `requirePermission()` from `src/lib/api-auth.ts`
- Session payload contains: `userId`, `email`, `role`, `organizationId`

### Roles & permissions

`OWNER` → full access. `MANAGER` → no user/store create/delete. `CASHIER` → POS + own orders/reports only. See `src/lib/permissions.ts`.

### API route pattern

```typescript
import { requireAuth, requirePermission } from "@/lib/api-auth";
import { db } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  // auth.ctx.session.organizationId for tenant scoping
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const denied = requirePermission(auth.ctx, "products.create");
  if (denied) return denied;
  // ...
}
```

### Key lib files

| File | Purpose |
|------|---------|
| `src/lib/prisma.ts` | Singleton Prisma client with PrismaPg adapter |
| `src/lib/auth.ts` | JWT session management, login/logout |
| `src/lib/api-auth.ts` | `requireAuth()`, `requirePermission()` for API routes |
| `src/lib/permissions.ts` | Role-based permission matrix |
| `src/lib/store-context.tsx` | Client-side store selection (React context + localStorage) |
| `src/lib/logger.ts` | Pino logger — use `logger.child({ module: "name" })` |

### UI stack

Shadcn (radix-nova style) + Tailwind v4 + Lucide icons. Components in `src/components/ui/`. Add new ones via `npx shadcn@latest add <component>`.

### Path alias

`@/*` → `./src/*`
