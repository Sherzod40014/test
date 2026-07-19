# 0002. ORM choice

## Status

Accepted

## Context

The API (`apps/api`) needs a database access layer over Postgres. The schema will grow
significantly: 15+ backend modules are planned across the WMS and later CRM/Finance phases, which
is expected to reach 60-100+ tables. We need an ORM that:

- Generates reliable, reviewable migrations at that scale, without drift between the schema
  definition and the actual database state.
- Supports a clean mechanism for cross-cutting concerns that must apply consistently across many
  models -- specifically tenant-scoping, soft-delete, and audit-log behavior, as described in
  ADR 0003's single-writer carton tracking pattern and the equivalent needs elsewhere in the
  schema.
- Scales organizationally: with 15+ modules each owning part of the schema, a single monolithic
  schema file becomes an unnecessary source of merge conflicts and unclear ownership.

The two alternatives considered were TypeORM and Drizzle.

- TypeORM's migration generation has known reliability and drift issues at larger schema sizes,
  and its decorator-based active-record/data-mapper hybrid style makes consistent cross-cutting
  behavior (e.g. "every query on a tenant-scoped table must filter by tenant") harder to enforce
  centrally.
- Drizzle has a lighter-weight, more SQL-like API, but lacks a mechanism equivalent to Prisma's
  Client Extensions for centrally intercepting and augmenting query behavior across models, and
  its migration-review tooling is less mature than Prisma's.

## Decision

We use Prisma as the ORM, via the `@erp/backend-database` lib.

- Prisma's Client Extensions mechanism will be used deliberately to implement the tenant-scoping,
  soft-delete, and audit-log cross-cutting concerns in one central place, rather than
  re-implementing them per-module.
- Prisma's migration-review workflow (generated, reviewable SQL migration files) is more mature
  than the alternatives at the schema scale we expect to reach.
- We enable Prisma's multi-file schema support (the `prismaSchemaFolder` preview feature), so each
  backend module owns its own `.prisma` file under `libs/backend/database/prisma/schema/`,
  mirroring the module-boundary goal at the database layer (see ADR 0001) instead of one large
  shared schema file.

## Consequences

- `@erp/backend-database` is a real pnpm workspace package (`workspace:*` dependency of
  `apps/api`), with its own `tsc` build step, rather than a path-aliased raw-source lib like the
  frontend-facing shared packages.
- Module owners add/modify only their own `.prisma` file under `prisma/schema/`; Prisma composes
  them into a single generated client.
- Client Extensions for tenant-scoping/soft-delete/audit-log are a shared responsibility that must
  be established early (M1) and consistently used by every module -- an application-level
  discipline that Prisma's mechanism supports but does not enforce on its own.
