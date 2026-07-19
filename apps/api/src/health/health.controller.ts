import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness check for the GS-ERP API' })
  @ApiResponse({
    status: 200,
    description: 'The service is up and responding to requests.',
  })
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
