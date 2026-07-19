import { Inject, Injectable } from '@nestjs/common';
import { EXTENDED_PRISMA_CLIENT, ExtendedPrismaClient } from '@erp/backend-database';
import { formatGsCode } from '@erp/shared-utils';
import { CreateCustomerDto } from './dto/create-customer.dto';

/**
 * Business logic for Customer master data, including server-side GS Code generation.
 *
 * Every method here goes through EXTENDED_PRISMA_CLIENT, which auto-injects companyId scoping
 * and soft-delete filtering for the Customer / CustomerSequence models based on the request's CLS
 * context (populated by JwtStrategy.validate() in the iam module) -- so nothing in this file
 * manually adds `where: { companyId }` or `where: { deletedAt: null }`.
 *
 * The one exception is `create`, which still needs the caller's companyId as an explicit
 * parameter purely to target the right CustomerSequence row inside the upsert's `where` clause
 * (CustomerSequence.companyId is a single-field unique key, and Prisma's upsert needs a concrete
 * unique `where` regardless of what the tenant-scope extension additionally merges in). companyId
 * is passed in from the controller (sourced from @CurrentUser()) rather than read out of CLS here,
 * so this service has no hidden dependency on request context and stays easy to unit test.
 */
@Injectable()
export class CustomerService {
  constructor(@Inject(EXTENDED_PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  async list(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count(),
    ]);

    return { items, total };
  }

  async create(dto: CreateCustomerDto, companyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sequence = await tx.customerSequence.upsert({
        where: { companyId },
        update: { lastSequence: { increment: 1 } },
        create: { companyId, lastSequence: 1 },
      });

      const gsCode = formatGsCode(sequence.lastSequence);

      return tx.customer.create({
        data: {
          name: dto.name,
          phone: dto.phone,
          contactPerson: dto.contactPerson,
          notes: dto.notes,
          gsCode,
          gsSequence: sequence.lastSequence,
        },
      });
    });
  }

  async findById(id: string) {
    return this.prisma.customer.findUnique({ where: { id } });
  }
}
