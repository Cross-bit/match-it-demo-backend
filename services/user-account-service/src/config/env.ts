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
    USES_SSL: z.string().default("0").transform((val) => val === "1"),
    // Database
    POSTGRES_USER: z.string().min(1, "POSTGRES_USER is required"),
    POSTGRES_HOST: z.string().min(1, "POSTGRES_HOST is required"),
    POSTGRES_DB: z.string().min(1, "POSTGRES_DB is required"),
    POSTGRES_PASSWORD: z.string().min(1, "POSTGRES_PASSWORD is required"),
    POSTGRES_PORT: z.coerce.number().default(5432),
    MAIN_DB_MAX_CONNECTIONS: z.coerce.number().default(10000),
    MINIMAL_PASSWORD_STRENGTH_LVL: z.coerce.number().default(3).transform(Number),

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
    USES_SSL: parsed.data.USES_SSL,

    DB_USER: parsed.data.POSTGRES_USER,
    DB_HOST: parsed.data.POSTGRES_HOST,
    DB_NAME: parsed.data.POSTGRES_DB,
    DB_PASSWORD: parsed.data.POSTGRES_PASSWORD,
    DB_PORT: parsed.data.POSTGRES_PORT,
    DB_MAX_CONNECTIONS: parsed.data.MAIN_DB_MAX_CONNECTIONS,

    GCS_BUCKET_NAME: parsed.data.GCS_BUCKET_NAME,
    IMAGE_UPLOAD_SERVER: parsed.data.IMAGE_UPLOAD_SERVER,

    MINIMAL_PASSWORD_STRENGTH_LVL: parsed.data.MINIMAL_PASSWORD_STRENGTH_LVL,
};