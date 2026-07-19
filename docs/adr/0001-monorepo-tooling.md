# 0001. Monorepo tooling

## Status

Accepted

## Context

GS-ERP is planned across six roadmap phases, starting with the WMS (this repo's initial focus)
and eventually growing to host many apps: the API, an admin web app, a worker PWA, a customer
portal, and future CRM/Finance apps, alongside a growing set of shared backend and frontend
libraries. At that scale, we will need:

- Enforced module boundaries between apps and libs (e.g. a frontend app must not reach into
  `libs/backend/*` internals; a CRM lib must not create a circular dependency on WMS libs), so the
  codebase doesn't erode into an unmanageable dependency graph as more teams and apps land.
- An "affected" style command so CI only builds/lints/tests the packages actually touched by a
  change, instead of the whole monorepo, once the package count is large.

Nx is purpose-built for both of these (tag-based project constraints for boundaries, and
`nx affected` for CI scoping), and is the target long-term monorepo tool for GS-ERP.

However, the environment this milestone (M0) was authored in has no local Node.js, pnpm, or
Docker installed. Nx configuration (`nx.json`, per-package `project.json`, target defaults,
plugin inference) is not something that can be reliably hand-written and verified without a
working Node toolchain to generate and test it against -- getting it subtly wrong would be worse
than not having it yet, because a broken Nx config is harder to diagnose than a simple absence of
one.

## Decision

Milestone M0 ships as a plain, hand-authored pnpm workspace: `apps/*`, `libs/backend/*`,
`libs/shared/*`, each with a standard `package.json` and `tsconfig.json`. There is no `nx.json`
and no `project.json` anywhere in this milestone.

The explicit next step -- to be done as the very first thing once a machine with Node.js is
available -- is running `npx nx@latest init` against this already-working pnpm workspace. Nx's
init command is specifically designed to retrofit onto an existing repo (it detects the workspace
layout and package manager and generates the appropriate config), which is far more reliable than
hand-simulating that config now with no way to test it.

## Consequences

- For M0, apps run via plain `package.json` scripts and `pnpm --filter <name> <script>` rather
  than Nx's `serve`/`affected` commands. This is functionally fine for a single-milestone scaffold.
- We do not yet get enforced module boundaries or Nx's build/task caching. Both arrive together
  with the `nx init` step, which should be prioritized early in M1 once Node.js is available.
- Until `nx init` runs, contributors must rely on code review and the TypeScript path-alias
  structure (see `tsconfig.base.json`) to keep module boundaries sane, rather than a lint rule
  enforcing them.
