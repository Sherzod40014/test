import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { PrismaModule } from '@erp/backend-database';
import { validate } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { IamModule } from './iam/iam.module';
import { MasterDataModule } from './master-data/master-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      // pnpm --filter @erp/api <script> runs with cwd set to apps/api, not the repo root, so
      // ConfigModule's default "look for .env in process.cwd()" would miss the root .env that
      // README's `cp .env.example .env` instructions create. __dirname is apps/api/src in dev
      // (ts-node) and apps/api/dist in the built app -- both are exactly two directories below
      // apps/api, which is one below the repo root, so three levels up from either always
      // resolves to the repo root regardless of how the process was launched.
      envFilePath: join(__dirname, '../../../.env'),
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    PrismaModule,
    HealthModule,
    IamModule,
    MasterDataModule,
  ],
})
export class AppModule {}
