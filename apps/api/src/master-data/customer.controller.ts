import { Body, Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '@erp/shared-dto';
import { JwtAuthGuard } from '../iam/guards/jwt-auth.guard';
import { RolesGuard } from '../iam/guards/roles.guard';
import { Roles } from '../iam/decorators/roles.decorator';
import { CurrentUser } from '../iam/decorators/current-user.decorator';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

/**
 * Minimal shape of req.user as attached by JwtStrategy.validate() in the iam module (see
 * apps/api/src/iam). Declared locally -- rather than importing iam's own type -- so master-data
 * only depends on the runtime decorator/guard exports it actually calls, not on the exact name of
 * an internal iam type. Field names/types must match the AUTH / API CONTRACT exactly.
 */
interface AuthenticatedUser {
  userId: string;
  companyId: string;
  email: string;
  roles: string[];
  hasAllWarehouseAccess: boolean;
  warehouseIds: string[];
}

interface CustomerListItemDto {
  id: string;
  gsCode: string;
  name: string;
  phone: string | null;
  contactPerson: string | null;
  createdAt: Date;
}

interface CustomerDetailDto extends CustomerListItemDto {
  notes: string | null;
}

interface CustomerListResponseDto {
  data: CustomerListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

// Role sets per the AUTH / API CONTRACT -- GET routes allow WAREHOUSE_OPERATOR read access,
// POST (write) does not.
const READ_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LOGISTICS_MANAGER', 'WAREHOUSE_OPERATOR'] as const;
const WRITE_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'LOGISTICS_MANAGER'] as const;

function toListItem(customer: {
  id: string;
  gsCode: string;
  name: string;
  phone: string | null;
  contactPerson: string | null;
  createdAt: Date;
}): CustomerListItemDto {
  return {
    id: customer.id,
    gsCode: customer.gsCode,
    name: customer.name,
    phone: customer.phone,
    contactPerson: customer.contactPerson,
    createdAt: customer.createdAt,
  };
}

function toDetail(customer: {
  id: string;
  gsCode: string;
  name: string;
  phone: string | null;
  contactPerson: string | null;
  notes: string | null;
  createdAt: Date;
}): CustomerDetailDto {
  return { ...toListItem(customer), notes: customer.notes };
}

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List customers for the caller company, paginated' })
  @ApiResponse({ status: 200, description: 'Paginated list of customers.' })
  async list(@Query() query: PaginationQueryDto): Promise<CustomerListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const { items, total } = await this.customerService.list(page, pageSize);

    return {
      data: items.map(toListItem),
      total,
      page,
      pageSize,
    };
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Create a customer; GS Code is always server-generated' })
  @ApiResponse({ status: 201, description: 'The created customer, including its new GS Code.' })
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerListItemDto> {
    const customer = await this.customerService.create(dto, user.companyId);
    return toListItem(customer);
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Get a single customer by id' })
  @ApiResponse({ status: 200, description: 'The matching customer.' })
  @ApiResponse({ status: 404, description: 'No customer with that id in the caller company.' })
  async findOne(@Param('id') id: string): Promise<CustomerDetailDto> {
    const customer = await this.customerService.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return toDetail(customer);
  }
}
