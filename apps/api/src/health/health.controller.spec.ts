import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports ok status with a numeric uptime', () => {
    const controller = new HealthController();
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
  });
});
