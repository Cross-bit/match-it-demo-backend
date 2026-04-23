import { parse } from "path";
import { z } from "zod";

/*
* =====================================================
* ENVIRONMENT CONFIGURATION -- DESCRIPTION
* =====================================================
* Centralized definition and validation of all environment variables.
*
* - Define every required env here with proper type & default.
* - Validation happens on startup -> app fails fast if config is invalid.
* - Always import from `env` instead of using process.env directly.
*
* Example:
*   import { env } from "../config/env";
*   console.log(env.DB_USER);
*
*/

const envSchema = z.object({
    // General
    USE_SSL: z.string().default("0").transform((val) => val === "1"),
    APP_CLIENT_UUID: z.string().min(1, "APP_CLIENT_UUID is required"),

    SESSION_CREATION_TIMEOUT_MS: z.string().default("300000").transform(Number),
    SESSION_MAX_DURATION_MS: z.string().default("3600000").transform(Number),
    MATCHING_SESSIONS_SERVICE_IDENTIFIER: z.string().default(""),

    RECSYS_TOKEN: z.string().default(""),
    SKIP_INTERNAL_AUTH: z.string().default("0").transform((val) => val === "1"),

    // Database
    POSTGRES_USER: z.string().min(1, "POSTGRES_USER is required"),
    POSTGRES_HOST: z.string().min(1, "POSTGRES_HOST is required"),
    POSTGRES_DB: z.string().min(1, "POSTGRES_DB is required"),
    POSTGRES_PASSWORD: z.string().min(1, "POSTGRES_PASSWORD is required"),
    POSTGRES_PORT: z.string().default("5432").transform(Number),
    POSTGRES_POOL_MAX: z.coerce.number().optional(),
    MAIN_DB_MAX_CONNECTIONS: z.string().default("100").transform(Number),

    // Recommendation service
    ACTIVITY_RECOMMENDATION_SYSTEM_API_BASE_URL: z
    .url("ACTIVITY_RECOMMENDATION_SYSTEM_API_BASE_URL must be a valid URL"),
    RECOMMENDATION_SYSTEM_PORT: z.coerce.number().int().min(1, "Port must be > 0"),

    // GCS
    GCS_BUCKET_NAME: z.string().default(""),
    IMAGE_UPLOAD_SERVER: z.enum(["local", "gcs"]).default("local"),
});

// Parse & validate
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    for (const issue of parsed.error.issues) {
        console.error(`- ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
}

/*
    --- Export ---
*/
export const env = {
    USE_SSL: parsed.data.USE_SSL,
    APP_CLIENT_UUID: parsed.data.APP_CLIENT_UUID,

    SESSION_CREATION_TIMEOUT_MS: parsed.data.SESSION_CREATION_TIMEOUT_MS,
    SESSION_MAX_DURATION_MS: parsed.data.SESSION_MAX_DURATION_MS,

    DB_USER: parsed.data.POSTGRES_USER,
    DB_HOST: parsed.data.POSTGRES_HOST,
    DB_NAME: parsed.data.POSTGRES_DB,
    DB_PASSWORD: parsed.data.POSTGRES_PASSWORD,
    DB_PORT: parsed.data.POSTGRES_PORT,
    DB_MAX_CONNECTIONS: parsed.data.POSTGRES_POOL_MAX ?? parsed.data.MAIN_DB_MAX_CONNECTIONS,

    RECOMMENDATIONS_URL: parsed.data.ACTIVITY_RECOMMENDATION_SYSTEM_API_BASE_URL,
    RECOMMENDATIONS_PORT: parsed.data.RECOMMENDATION_SYSTEM_PORT,

    RECSYS_TOKEN: parsed.data.RECSYS_TOKEN,
    SKIP_INTERNAL_AUTH: parsed.data.SKIP_INTERNAL_AUTH,
    MATCHING_SESSIONS_SERVICE_IDENTIFIER: parsed.data.MATCHING_SESSIONS_SERVICE_IDENTIFIER,

    GCS_BUCKET_NAME: parsed.data.GCS_BUCKET_NAME,
    IMAGE_UPLOAD_SERVER: parsed.data.IMAGE_UPLOAD_SERVER,
};