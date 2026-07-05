import { z } from 'zod';

// Secrets require a real value (min length) and have NO default: a missing
// secret must fail the boot, never silently fall back.
const secret = z.string().min(32);

export const EnvSchema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),
  JWT_ACCESS_SECRET: secret,
  JWT_REFRESH_SECRET: secret,
  INTERNAL_API_TOKEN: secret,
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
});

export type AppConfig = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  rabbitmqUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  internalApiToken: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
};

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    // Surface which keys failed so the boot log is actionable.
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const env_ = parsed.data;
  return {
    port: env_.PORT,
    databaseUrl: env_.DATABASE_URL,
    redisUrl: env_.REDIS_URL,
    rabbitmqUrl: env_.RABBITMQ_URL,
    jwtAccessSecret: env_.JWT_ACCESS_SECRET,
    jwtRefreshSecret: env_.JWT_REFRESH_SECRET,
    internalApiToken: env_.INTERNAL_API_TOKEN,
    jwtAccessTtl: env_.JWT_ACCESS_TTL,
    jwtRefreshTtl: env_.JWT_REFRESH_TTL,
  };
}
