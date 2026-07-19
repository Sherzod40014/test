import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EXTENDED_PRISMA_CLIENT, ExtendedPrismaClient } from '@erp/backend-database';
import { JwtAuthGuard } from '../iam/guards/jwt-auth.guard';

interface WarehouseResponseDto {
  id: string;
  code: string;
  name: string;
  country: string;
  timezone: string;
  isActive: boolean;
}

/**
 * Warehouses are seeded (see libs/backend/database/prisma/seed.ts), not created via this API --
 * M1 only needs a read endpoint. Any authenticated user, regardless of role, may list warehouses.
 */
@ApiTags('warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouses')
export class WarehouseController {
  constructor(@Inject(EXTENDED_PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  @Get()
  @ApiOperation({ summary: "List warehouses for the authenticated caller's company" })
  @ApiResponse({ status: 200, description: 'Warehouses belonging to the caller company.' })
  async list(): Promise<{ data: WarehouseResponseDto[] }> {
    const warehouses = await this.prisma.warehouse.findMany({
      orderBy: { name: 'asc' },
    });

    return {
      data: warehouses.map((warehouse) => ({
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
        country: warehouse.country,
        timezone: warehouse.timezone,
        isActive: warehouse.isActive,
      })),
    };
  }
}
