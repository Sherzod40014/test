# 0004: GS Code generation via a per-company sequence row

## Context

Every customer gets a permanent, sequential, never-reused code (GS001, GS002, ... the business is
currently at GS450 in its existing manual process). This code appears on every label, QR code,
invoice, packing list, and the customer portal — it must never collide, never be reused after a
customer is deleted, and must restart from GS001 independently for each company (this system is
multi-company from day one, even though only one company exists today).

Three options were considered for generating the next number:

1. **`COUNT(*)` of existing customers + 1.** Rejected outright: breaks the moment a customer is
   soft-deleted (the count drops, so the next generated code would collide with a code already
   issued), and is not safely concurrent (two simultaneous signups could read the same count).
2. **A native PostgreSQL `SEQUENCE` object per company**, created dynamically per company. Works,
   but Prisma has no first-class schema support for dynamically-created per-row sequences (Prisma
   `@default(autoincrement())` maps to one static sequence per column, not one per company), so
   this would require hand-written raw SQL migrations outside Prisma's normal schema-driven
   workflow for every new company — a maintenance burden not worth taking on this early.
3. **A dedicated `CustomerSequence` table, one row per company, incremented via `upsert` inside a
   transaction.** Chosen.

## Decision

`CustomerSequence` (see `libs/backend/database/prisma/schema/master-data.prisma`) has exactly one
row per `Company`, holding `lastSequence`. `CustomerService.create()`
(`apps/api/src/master-data/customer.service.ts`) increments it atomically via
`prisma.customerSequence.upsert({ where: { companyId }, update: { lastSequence: { increment: 1 } },
create: { companyId, lastSequence: 1 } })` inside a `$transaction` together with the `Customer`
row creation, then formats the result with `formatGsCode()` (`libs/shared/utils`) into `GS001`
style. The increment is a single atomic UPDATE at the database level (Prisma compiles
`{ increment: 1 }` to `SET last_sequence = last_sequence + 1`), so concurrent customer creation
requests for the same company cannot produce duplicate codes.

The sequence value is the source of truth for "what's next" — not `COUNT(Customer)` — so a
soft-deleted customer's code is permanently retired and can never be reissued.

## Consequences

- `Customer.gsCode` is unique **per company** (`@@unique([companyId, gsCode])`), not globally —
  this falls directly out of the sequence being per-company: two different companies' first
  customers both legitimately get the literal code "GS001". A bare global `@unique` on `gsCode`
  was tried first and immediately shown to be wrong by the isolation test suite (a second
  company's first customer creation failed with a unique-constraint violation, since the first
  company had already taken "GS001") — worth calling out explicitly here since it's an easy
  mistake to reintroduce: don't add a bare `@unique` to `gsCode` again without re-reading this
  ADR. If GS Codes ever need to be *displayed* unambiguously across companies (e.g. a future
  cross-company support/reporting view), that's a presentation-layer concern (prefix with a
  company short-code when rendering), not a schema-level uniqueness constraint.
- Every code-generating write is one extra row read/write (the `CustomerSequence` upsert) beyond
  the `Customer` insert itself — negligible at any realistic scale for this workload (customer
  creation is a low-frequency, human-driven action, not a hot path).
