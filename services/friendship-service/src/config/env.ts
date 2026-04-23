/*
 * Centralized environment configuration for friendship-service.
 * Keep all env reads in one place and fail fast on invalid config.
 */

const readString = (key: string, fallback?: string): string => {
    const value = process.env[key] ?? fallback;
    if (value === undefined || value === "") {
        throw new Error(`Missing required env variable: ${key}`);
    }
    return value;
};

const readNumber = (key: string, fallback?: number): number => {
    const raw = process.env[key] ?? (fallback !== undefined ? String(fallback) : undefined);
    if (raw === undefined || raw === "") {
        throw new Error(`Missing required numeric env variable: ${key}`);
    }

    const value = Number(raw);
    if (Number.isNaN(value)) {
        throw new Error(`Invalid numeric env variable ${key}: ${raw}`);
    }
    return value;
};

const readBool01 = (key: string, fallback: "0" | "1" = "0"): boolean => {
    const raw = process.env[key] ?? fallback;
    return raw === "1";
};

const poolMaxRaw = process.env.POSTGRES_POOL_MAX ?? process.env.MAIN_DB_MAX_CONNECTIONS;
const poolMaxParsed = poolMaxRaw ? Number(poolMaxRaw) : 100;
if (Number.isNaN(poolMaxParsed)) {
    throw new Error(`Invalid numeric env variable POSTGRES_POOL_MAX/MAIN_DB_MAX_CONNECTIONS: ${poolMaxRaw}`);
}

export const env = {
    PORT: readNumber("PORT", 5500),
    USES_SSL: readBool01("USES_SSL", "0"),

    DB_USER: readString("POSTGRES_USER"),
    DB_HOST: readString("POSTGRES_HOST"),
    DB_NAME: readString("POSTGRES_DB"),
    DB_PASSWORD: readString("POSTGRES_PASSWORD"),
    DB_PORT: readNumber("POSTGRES_PORT", 5432),
    DB_MAX_CONNECTIONS: poolMaxParsed,

    ACCESS_TOKEN_SECRET: readString("ACCESS_TOKEN_SECRET"),

    FIREBASE_CREDENTIALS_JSON: process.env.FIREBASE_CREDENTIALS_JSON ?? "",
    FIREBASE_APPLICATION_CREDENTIALS: process.env.FIREBASE_APPLICATION_CREDENTIALS ?? ""
};
