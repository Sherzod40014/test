import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The plaintext refresh token previously issued by /auth/login or /auth/refresh.' })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
