import { Global, Module } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from './prisma.service';
import { createExtendedPrismaClient, EXTENDED_PRISMA_CLIENT } from './extended-prisma-client';

/**
 * Relies on ClsModule.forRoot({ global: true, ... }) being registered once, elsewhere in the app
 * (apps/api/src/app.module.ts) -- since it's global, ClsService is injectable here without this
 * module importing ClsModule itself.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: EXTENDED_PRISMA_CLIENT,
      useFactory: (prisma: PrismaService, cls: ClsService) => createExtendedPrismaClient(prisma, cls),
      inject: [PrismaService, ClsService],
    },
  ],
  exports: [PrismaService, EXTENDED_PRISMA_CLIENT],
})
export class PrismaModule {}
