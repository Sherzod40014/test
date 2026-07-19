# syntax=docker/dockerfile:1

# ---- Stage 1: deps -------------------------------------------------------
# Installs the full pnpm workspace dependency graph needed to build
# @erp/api and its workspace dependency @erp/backend-database.
# Only manifest files are copied here so this layer is cached unless a
# package.json / lockfile actually changes.
FROM node:20-alpine AS deps
WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY libs/backend/database/package.json ./libs/backend/database/package.json

RUN pnpm install --frozen-lockfile

# ---- Stage 2: build -------------------------------------------------------
# Copies full source and compiles the database lib first (apps/api depends
# on its build output via workspace linkage), then compiles the API itself.
FROM node:20-alpine AS build
WORKDIR /workspace
RUN corepack enable

COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/api/node_modules ./apps/api/node_modules
COPY . .

RUN pnpm --filter @erp/backend-database build
RUN pnpm --filter @erp/api build

# ---- Stage 3: runtime -------------------------------------------------------
# Minimal final image: only the compiled output and production
# node_modules are carried forward, nothing else from the build stage.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /workspace/apps/api/dist ./dist
COPY --from=build /workspace/apps/api/package.json ./package.json
COPY --from=build /workspace/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/main.js"]
