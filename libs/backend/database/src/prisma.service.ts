import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/client';

// ---------------------------------------------------------------------------------------------
// Prisma Client Extensions -- to be registered on `this` in this class starting in Milestone M1,
// in this exact order. Full reasoning: docs/adr/0002-orm-choice.md.
//
//   1. tenant-scope extension -- auto-injects a `company_id = ctx.companyId` filter on every
//      tenant-scoped model query, sourced from the nestjs-cls request context, so cross-company
//      data leaks are impossible by construction.
//   2. soft-delete extension -- rewrites deletes into `deleted_at` timestamp updates and filters
//      out rows with `deleted_at` set on reads by default.
//   3. audit-log extension -- diffs before/after state within the same transaction and writes an
//      AuditEntry row (actor, entity, action, changed fields).
// ---------------------------------------------------------------------------------------------
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
