import { Controller, Get } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
}

@Controller('health')
export class HealthController {
  /**
   * Reports that the API process is up, for Docker health checks and the reverse proxy.
   */
  @Get()
  check(): HealthStatus {
    return { status: 'ok' };
  }
}
