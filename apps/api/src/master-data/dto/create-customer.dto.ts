import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Body for POST /customers. gsCode/gsSequence are never accepted from the client -- they are
 * always server-generated (see CustomerService.create).
 */
export class CreateCustomerDto {
  @ApiProperty({ example: 'Silk Road Trading LLC' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Alisher Karimov' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ example: 'Prefers WeChat for updates.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
