import { loadConfig } from './env.schema';

const base = {
  PORT: '3333',
  DATABASE_URL: 'postgres://mlp:mlp@localhost:5442/mlp',
  REDIS_URL: 'redis://localhost:6389',
  RABBITMQ_URL: 'amqp://guest:guest@localhost:5682',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  INTERNAL_API_TOKEN: 'c'.repeat(32),
  PROVIDER_KEY_ENCRYPTION_KEY: 'd'.repeat(32),
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
};

describe('loadConfig', () => {
  it('parses a valid environment', () => {
    const config = loadConfig(base);
    expect(config.port).toBe(3333);
    expect(config.databaseUrl).toBe(base.DATABASE_URL);
    expect(config.jwtAccessSecret).toBe(base.JWT_ACCESS_SECRET);
  });

  it('throws when a required secret is missing (no default)', () => {
    const { JWT_ACCESS_SECRET, ...withoutSecret } = base;
    expect(() => loadConfig(withoutSecret)).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('throws when a secret is too short', () => {
    expect(() => loadConfig({ ...base, INTERNAL_API_TOKEN: 'short' })).toThrow(
      /INTERNAL_API_TOKEN/,
    );
  });

  it('defaults PORT to 3333 when absent (non-secret may default)', () => {
    const { PORT, ...withoutPort } = base;
    expect(loadConfig(withoutPort).port).toBe(3333);
  });
});
