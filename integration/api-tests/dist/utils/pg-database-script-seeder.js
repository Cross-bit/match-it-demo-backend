"use strict";
// ======================================
// DESCRIPTION
// ======================================
// Seeds(==mocks) database with test dataset for the
// integration api tests using predefined SQL
// script files in api-tests.
// Useful for trivial seeding with a lot of
// simple static data
//
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresDbSeederFactory = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const settings = __importStar(require("../generalSettings"));
const pg_1 = require("pg");
const fs_1 = __importDefault(require("fs"));
const envVars = (() => {
    const res = dotenv_1.default.config({ path: settings.ENV_FILE });
    if (res.error)
        throw res.error;
    return res.parsed;
})();
/**
 * Creates data seeders for specific postgres databases.
 * Expected to be used to create postgres database seeders.
 */
class PostgresDbSeederFactory {
    static createMainDb1Seeder() {
        const dbSeeder = new PostgresDbSeeder();
        const user = envVars === null || envVars === void 0 ? void 0 : envVars.MAIN_DB_USER;
        const password = envVars === null || envVars === void 0 ? void 0 : envVars.MAIN_DB_PASS;
        const database = envVars === null || envVars === void 0 ? void 0 : envVars.MAIN_DB_NAME;
        const host = envVars === null || envVars === void 0 ? void 0 : envVars.MAIN_DB_HOST;
        const port = +(envVars === null || envVars === void 0 ? void 0 : envVars.MAIN_DB_PORT);
        const conConfig = {
            user: user,
            password: password,
            database: database,
            host: host,
            port: port
        };
        dbSeeder.setConnection(conConfig);
        return dbSeeder;
    }
}
exports.PostgresDbSeederFactory = PostgresDbSeederFactory;
/**
 * Seeds postgres database using provided script/scripts
 */
class PostgresDbSeeder {
    constructor() {
        this.seedScriptFile = [];
        this.pool = null;
    }
    setConnection(poolConfig) {
        this.pool = new pg_1.Pool(poolConfig);
    }
    setupDatabase(seedScripFile) {
        return __awaiter(this, void 0, void 0, function* () {
            const seedFiles = Array.isArray(seedScripFile) ? seedScripFile : [seedScripFile];
            for (const seedFile of seedFiles) {
                if (this.fileMissing(seedFile))
                    throw Error(`Db seed file does not exit: ${seedFile}`);
                const seedScript = fs_1.default.readFileSync(seedFile, 'utf8');
                yield this.executeSQLScript(seedScript);
            }
        });
    }
    cleanupDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool) {
                throw Error("No db configuration set!");
            }
            const client = yield this.pool.connect();
            try {
                const truncateAllTablesQuery = `
            DO $$
            DECLARE
                stmt TEXT;
                table_name TEXT;
            BEGIN
                FOR table_name IN
                    SELECT tablename FROM pg_tables WHERE schemaname = 'public' -- Adjust if you're not using the public schema
                LOOP
                    stmt := format('TRUNCATE TABLE %I CASCADE', table_name);
                    EXECUTE stmt;
                END LOOP;
            END $$;
            `;
                yield client.query(truncateAllTablesQuery);
            }
            finally {
                client.release();
            }
        });
    }
    executeSQLScript(query) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool) {
                throw Error("No db configuration set!");
            }
            const client = yield (this === null || this === void 0 ? void 0 : this.pool.connect());
            try {
                yield client.query('BEGIN');
                yield client.query(query);
                yield client.query('COMMIT');
            }
            catch (e) {
                yield client.query('ROLLBACK');
                throw e;
            }
            finally {
                client.release();
            }
        });
    }
    executeQuery(query) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool) {
                throw Error("No db configuration set!");
            }
            yield this.executeSQLScript(query);
        });
    }
    fileMissing(file) {
        return !fs_1.default.existsSync(file);
    }
}
