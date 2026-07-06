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
  // Allowed browser origin for CORS (the web app). Not a secret.
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  // Public base URL the API is reachable at — used to build avatar links.
  API_PUBLIC_URL: z.string().url().default('http://localhost:3334'),
  // MinIO object storage (local-dev infra creds, like Postgres — not secrets).
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9010),
  MINIO_ACCESS_KEY: z.string().default('mlp'),
  MINIO_SECRET_KEY: z.string().default('mlpsecret123'),
  MINIO_BUCKET: z.string().default('avatars'),
  // Python search/indexing service base URL. Empty until Spec 2 is deployed.
  SEARCH_SERVICE_URL: z.string().default(''),
  // Service token the search proxy sends to the Python /search (= RAG_SERVICE_API_TOKEN).
  SEARCH_SERVICE_TOKEN: z.string().default(''),
  // SMTP para envio de e-mail (dev: Mailpit em localhost:1025, sem auth).
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default('my-little-pony <no-reply@mlp.local>'),
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
  webOrigin: string;
  apiPublicUrl: string;
  minioEndpoint: string;
  minioPort: number;
  minioAccessKey: string;
  minioSecretKey: string;
  minioBucket: string;
  searchServiceUrl: string;
  searchServiceToken: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  mailFrom: string;
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
    webOrigin: env_.WEB_ORIGIN,
    apiPublicUrl: env_.API_PUBLIC_URL,
    minioEndpoint: env_.MINIO_ENDPOINT,
    minioPort: env_.MINIO_PORT,
    minioAccessKey: env_.MINIO_ACCESS_KEY,
    minioSecretKey: env_.MINIO_SECRET_KEY,
    minioBucket: env_.MINIO_BUCKET,
    searchServiceUrl: env_.SEARCH_SERVICE_URL,
    searchServiceToken: env_.SEARCH_SERVICE_TOKEN,
    smtpHost: env_.SMTP_HOST,
    smtpPort: env_.SMTP_PORT,
    smtpSecure: env_.SMTP_SECURE,
    smtpUser: env_.SMTP_USER,
    smtpPass: env_.SMTP_PASS,
    mailFrom: env_.MAIL_FROM,
  };
}
