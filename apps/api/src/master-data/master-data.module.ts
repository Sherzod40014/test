import { Module } from '@nestjs/common';
import { WarehouseController } from './warehouse.controller';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

/**
 * Warehouse (read-only) + Customer (CRUD with server-side GS Code generation) master data.
 *
 * Guards (JwtAuthGuard, RolesGuard) are referenced directly via @UseGuards(...) inside the
 * controllers rather than imported as providers of this module. Nest instantiates guard classes
 * referenced that way through its own DI container -- they don't need to be declared as providers
 * here, only their own dependencies (Reflector for RolesGuard, which @nestjs/core provides
 * globally) need to be resolvable, which they are. This keeps MasterDataModule decoupled from
 * IamModule (no direct import needed); IamModule must still be wired into AppModule alongside this
 * module for the 'jwt' Passport strategy to actually be registered at runtime.
 */
@Module({
  controllers: [WarehouseController, CustomerController],
  providers: [CustomerService],
})
export class MasterDataModule {}
