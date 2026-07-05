import { Controller, Get } from '@nestjs/common';

type HealthResult = { status: 'ok'; uptime: number };

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResult {
    // Liveness only. Dependency readiness (pg/redis/rabbit) is added when those
    // adapters land in later plans.
    return { status: 'ok', uptime: process.uptime() };
  }
}
