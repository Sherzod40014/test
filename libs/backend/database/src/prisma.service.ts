import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/client';

/**
 * Handles connection lifecycle only. This class is NOT what business code should inject and
 * query through -- inject EXTENDED_PRISMA_CLIENT (see extended-prisma-client.ts) instead, which
 * wraps this instance with the tenant-scope, soft-delete, and audit-log Client Extensions.
 * PrismaService stays a plain, unextended PrismaClient subclass because Prisma's `$extends()`
 * returns a differently-typed client that can't be assigned back onto `this` -- see
 * docs/adr/0002-orm-choice.md for why we split lifecycle (this class) from the extended query
 * surface (extended-prisma-client.ts) instead of forcing them into one class.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
