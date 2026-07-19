# 0005: Stateless JWT auth with claims-driven request context, rotating refresh tokens

## Context

M1 needs real authentication and role/warehouse-based authorization before any other module can
safely go live (see docs/adr/0002-orm-choice.md's tenant-scope extension, which depends entirely
on the request context being populated correctly before any tenant-scoped query runs). The
requirements driving this: 1000 concurrent users and sub-second responses (ruling out a DB lookup
on every single request just to know who's calling), warehouse-level data isolation per user
(WAREHOUSE_OPERATOR accounts must not see other warehouses' data), and a small, fixed set of
real-world roles (SUPER_ADMIN, COMPANY_ADMIN, LOGISTICS_MANAGER, WAREHOUSE_OPERATOR, CUSTOMER).

## Decision

- **Stateless short-lived JWT access tokens** (`JWT_ACCESS_TTL`, default 15m), signed with a
  shared secret (`JWT_SECRET`). The payload carries everything a request needs to authorize
  itself without a database round-trip: `sub` (user id), `companyId`, `email`, `roles[]`,
  `hasAllWarehouseAccess`, `warehouseIds[]`. `hasAllWarehouseAccess` is computed once, at
  login/refresh time, from the user's roles (true for SUPER_ADMIN/COMPANY_ADMIN/
  LOGISTICS_MANAGER) — this is the intentional tradeoff of claims-in-JWT: a warehouse-access
  change for a WAREHOUSE_OPERATOR doesn't take effect until their next token refresh (at most
  `JWT_ACCESS_TTL`, 15 minutes, later), not instantly. Judged acceptable — warehouse reassignment
  is a rare, human-driven admin action, not something that needs sub-second propagation — against
  the alternative (a DB lookup on every request) which would work against the concurrency/latency
  requirement directly.
- **`JwtStrategy.validate()` is the single place that populates the nestjs-cls request context**
  (`libs/backend/database/src/request-context.ts`'s `CLS_KEY_*` constants) that the tenant-scope
  Prisma extension depends on. This ties authentication and tenant-scoping together deliberately:
  it is structurally impossible for a tenant-scoped query to run without having gone through JWT
  validation first, because nothing else in the request pipeline sets those CLS keys.
- **Refresh tokens are long-lived (`JWT_REFRESH_TTL`, default 30d), opaque random strings, stored
  only as a bcrypt hash** (`RefreshToken.tokenHash`), never in plaintext — a stolen database dump
  alone cannot be replayed as a live session. `POST /auth/refresh` rotates: the presented token is
  revoked (`revokedAt` set) and a brand new one issued, every time, so a refresh token is
  effectively single-use. Roles/warehouse access/`isActive` are re-read from the database on every
  refresh (not trusted from the old token), so a deactivated user or a role change is reflected
  within one refresh cycle even though it isn't instant on the access token alone.
- **Password hashing uses `bcryptjs`** (pure JavaScript), not the native `bcrypt`/`argon2`
  bindings, specifically because this system was scaffolded without a working Node.js
  installation to verify native-module compilation against — `bcryptjs` guarantees a clean
  `pnpm install` on any target machine with zero native build-tool dependencies. Revisit if
  password-hashing throughput ever becomes a measured bottleneck (unlikely at login-only
  frequency).
- **Roles are a fixed Prisma enum** (`RoleName`), not a dynamic permissions table. The business
  has five concrete roles today and no stated need for ad-hoc custom roles; a fully dynamic
  RBAC/permission-matrix system is real complexity that isn't justified yet. If/when a customer
  needs custom roles, that's a deliberate, visible migration — not something to speculatively
  build now.
- **`@Roles()` + `RolesGuard` is opt-in, not deny-by-default**: a route with no `@Roles()`
  decorator is allowed through by `RolesGuard` as long as `JwtAuthGuard` already authenticated the
  caller. This means every controller must explicitly apply `@UseGuards(JwtAuthGuard, ...)` at
  minimum — there is no global guard silently protecting every route yet. This is worth
  revisiting once the module surface grows past M1: a global `APP_GUARD` defaulting to
  "authenticated required unless explicitly marked public" is safer than the current
  every-controller-opts-in model, and should be introduced before this system has enough routes
  that a forgotten `@UseGuards()` becomes a realistic, easy-to-miss mistake.

## Consequences

- `WarehouseAccessGuard` (per-warehouse route protection, e.g. "an operator may only touch their
  own assigned warehouse's cargo") is deliberately NOT built in M1 — no M1 endpoint is
  warehouse-scoped yet (`GET /warehouses` is company-wide). `hasAllWarehouseAccess`/
  `warehouseIds` already exist on both the JWT payload and the CLS context specifically so that
  guard is a pure addition when M2/M3 introduce warehouse-scoped endpoints, not a redesign.
- The opt-in `@Roles()` model (see above) means a new controller that forgets `@UseGuards(...)`
  entirely is publicly accessible with no authentication at all, not just unrestricted-by-role —
  flagged above as a real gap to close (a global default-deny guard) before this surface grows
  much further.
