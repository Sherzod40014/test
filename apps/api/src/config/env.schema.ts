import { z } from 'zod';

/**
 * Environment variable schema for the GS-ERP API.
 * Validated once at boot by NestJS ConfigModule (see app.module.ts).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  RABBITMQ_URL: z.string(),

  MINIO_ENDPOINT: z.string(),
  MINIO_PORT: z.coerce.number().int().positive(),
  MINIO_USE_SSL: z.coerce.boolean(),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET_MEDIA: z.string(),
  MINIO_BUCKET_DOCUMENTS: z.string(),
  MINIO_BUCKET_LABELS: z.string(),

  JWT_SECRET: z.string(),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Called by NestJS ConfigModule.forRoot({ validate }) at boot time.
 * Throws a readable, aggregated error if any environment variable is
 * missing or malformed so misconfiguration fails fast instead of
 * surfacing as a confusing runtime error later.
 */
export function validate(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return result.data;
}
