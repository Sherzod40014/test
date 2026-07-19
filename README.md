# GS-ERP

Enterprise ERP for an international freight-forwarding (cargo expeditor) company operating
between China and Uzbekistan. Modular, cloud-native, mobile-first, multilingual
(EN / RU / UZ / ZH). Built in phases toward SAP S/4HANA / Odoo Enterprise-level capability —
never a simple CRUD app.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Enterprise WMS | 🚧 in progress (this repo, current focus) |
| 2 | Enterprise CRM | planned |
| 3 | Finance & Accounting | planned |
| 4 | Mobile Applications | planned |
| 5 | Telegram Ecosystem | planned |
| 6 | Artificial Intelligence | planned |

## Phase 1 — Core WMS milestones

Built core-chain-first: one complete, working cargo lifecycle end-to-end before layering on
enhancements.

| # | Scope |
|---|---|
| M0 | Workspace scaffold, infra, inert app shells *(this commit)* |
| M1 | IAM + RBAC + warehouse isolation + audit/soft-delete + Company/Warehouse/Customer + GS Code |
| M2 | Cargo receiving: intake, unknown/estimated cargo, product grouping A/B/C, measurement (per-carton / bulk), media upload |
| M3 | Labeling: Carton/QR + movement timeline, shelf entities + shelf QR, two-step put-away |
| M4 | Loading planning (checkbox filters) + mobile scan-to-load + partial multi-truck loading + real-time progress |
| M5 | Multi-warehouse chain (e.g. Kashgar handoff): chained plans, live amendment, packing-list auto-update |
| M6 | Customs costs + pricing engine + mandatory manager approval gate + invoicing |
| M7 | Customer portal (read-only, GS-code-scoped) |
| M8 | AI (Claude) product-name translation ZH→RU/EN/UZ + universal search + Telegram notifications |
| M9 | Damage claims + photo annotation + visual warehouse map + audit viewer + KPI dashboard |

Deferred past this core build (not dropped — tracked for later): drag-and-drop visual loading
planner, physical RFID/GPS/Bluetooth-scanner/Zebra-printer hardware integration, ElasticSearch,
Flutter native app, GraphQL, Finance/AR ledger (Phase 3), CRM (Phase 2), automated FX feeds,
Kubernetes/cloud deployment.

## Architecture

- **Backend**: Node.js + NestJS + TypeScript — modular monolith (`apps/api`), one process,
  hard module boundaries by convention (a module only calls another module's exported service,
  never its Prisma models directly). Bounded contexts: iam, master-data, cargo-receiving,
  grouping, measurement, labeling, warehouse-ops, loading-planning, trucking, customs-costs,
  pricing-invoicing, documents-media, translation-i18n, notifications-telegram, audit-log,
  search, reporting-dashboard. Landed incrementally, one per milestone above.
- **Frontend (admin/manager)**: React + Vite — `apps/admin-web`.
- **Frontend (warehouse workers)**: React + Vite PWA, offline-capable, camera QR scanning —
  `apps/worker-pwa`. Native Flutter app is a later phase, not now.
- **Customer portal**: React + Vite — `apps/customer-portal`, read-only, scoped strictly to the
  customer's own GS Code data. Scaffolded now, built out in M7.
- **Database**: PostgreSQL via Prisma (`libs/backend/database`), multi-file schema per module.
  Every carton's movement is an **insert-only event log** (`CartonEvent`), not just a mutable
  status field — the `Carton` row itself is a current-state projection for fast reads.
- **Cache / queue**: Redis + RabbitMQ.
- **Object storage**: S3-compatible (MinIO locally, swappable to S3/Alibaba OSS later) for
  photos, videos, and supplier documents.
- **API**: REST first, OpenAPI/Swagger-documented. GraphQL is future/ready, not built yet.
- **Languages**: EN / RU / UZ / ZH throughout every interface. Chinese product names entered by
  warehouse staff are auto-translated (Claude API) to RU/EN/UZ in M8, with the original Chinese
  text always preserved and a human able to override the translation.

See `docs/adr/` for the reasoning behind these choices, including the monorepo-tooling decision.

## Getting started

Requires **Node.js ≥ 20**, **pnpm** (via `corepack enable`, then `corepack use pnpm@9.12.0` —
or just run `pnpm install`, corepack will read the pinned version from `package.json`), and
**Docker Desktop** (with WSL2 backend on Windows) for local infrastructure.

```bash
cp .env.example .env

pnpm install

pnpm docker:up          # Postgres, Redis, RabbitMQ, MinIO
pnpm prisma:generate
pnpm prisma:migrate

pnpm dev:api             # NestJS API   → http://localhost:3000  (Swagger at /api/docs)
pnpm dev:admin            # Admin web    → http://localhost:4200
pnpm dev:worker-pwa        # Worker PWA   → http://localhost:4201
```

### Note on this scaffold

This initial scaffold (M0) was authored without a local Node.js/Docker environment available to
run and verify it end-to-end (see `docs/adr/0001-monorepo-tooling.md`). Everything here is
written to standard, well-established conventions, but **the very first thing to do on a machine
with Node.js is**:

1. `pnpm install` and fix anything that surfaces (dependency version skew is possible since
   versions were pinned without live registry access).
2. Walk through the "Getting started" steps above end-to-end.
3. Bootstrap Nx (`npx nx@latest init`) as described in `docs/adr/0001-monorepo-tooling.md` — the
   long-term plan uses Nx for enforced module boundaries and an affected-graph in CI as this
   monorepo grows across all six roadmap phases; M0 intentionally ships as a plain pnpm workspace
   so nothing here depends on hand-guessed Nx configuration.
