// ======================================
// DESCRIPTION
// ======================================
// Seeds(==mocks) database with test dataset for the
// integration api tests using predefined SQL
// script files in api-tests.
// Useful for trivial seeding with a lot of
// simple static data
//

import dotenv, { DotenvParseOutput } from 'dotenv'
import * as settings from '../generalSettings'
import { Pool, PoolConfig } from 'pg';
import fs from 'fs';

const envVars: DotenvParseOutput | undefined = (() => {

    const res = dotenv.config({ path: settings.ENV_FILE })

    if (res.error)
        throw res.error

    return res.parsed
})()

/**
 * Creates data seeders for specific postgres databases.
 * Expected to be used to create postgres database seeders.
 */
export class PostgresDbSeederFactory {

    public static createMainDb1Seeder(): PostgresSeeder {
        const dbSeeder = new PostgresDbSeeder();

        const user = envVars?.MAIN_DB_USER as string
        const password = envVars?.MAIN_DB_PASS as string
        const database = envVars?.MAIN_DB_NAME as string
        const host = envVars?.MAIN_DB_HOST as string
        const port = +(envVars?.MAIN_DB_PORT as string)

        const conConfig: PoolConfig = {
            user: user,
            password: password,
            database: database,
            host: host,
            port: port
        }

        dbSeeder.setConnection(conConfig)

        return dbSeeder
    }
}

/**
 * Public client's interface for the pg seeder class.
 */
export interface PostgresSeeder {
    /**
     * Seeds database using provided scripts.
     * @param seedScripFile
     */
    setupDatabase(seedScripFile: string|string[]): void;

    /**
     * Cleans all the rows from all the tables (leaves tables and other settings intact).
     */
    cleanupDatabase(): void;

    /**
     * Cleans only seeded database tables (leaves tables and other settings intact).
     */
    //cleanupSeededTables(): void;

    /**
     * Allows additional query execution.
     * @param query SQL query
     */
    executeQuery(query: string): void;
}


/**
 * Seeds postgres database using provided script/scripts
 */
class PostgresDbSeeder implements PostgresDbSeeder
{

    seedScriptFile: string|string[] = [];
    pool: Pool|null = null

    setConnection(poolConfig: PoolConfig) {
        this.pool = new Pool(poolConfig);
    }

    async setupDatabase(seedScripFile: string|string[]) {

        const seedFiles = Array.isArray(seedScripFile) ? seedScripFile : [seedScripFile]

        for (const seedFile of seedFiles) {
            if (this.fileMissing(seedFile))
                throw Error(`Db seed file does not exit: ${seedFile}`)

            const seedScript = fs.readFileSync(seedFile, 'utf8')
            await this.executeSQLScript(seedScript)
        }
    }

    public async cleanupDatabase() {

        if (!this.pool){
            throw Error("No db configuration set!")
        }

        const client = await this.pool.connect();
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

            await client.query(truncateAllTablesQuery);
        }
        finally {
            client.release();
        }
    }

    private async executeSQLScript(query: string) {

        if (!this.pool){
            throw Error("No db configuration set!")
        }

        const client = await this?.pool.connect();

        try {
            await client.query('BEGIN');
            await client.query(query);
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    public async executeQuery(query: string) {

        if (!this.pool){
            throw Error("No db configuration set!")
        }

        await this.executeSQLScript(query)
    }

    private fileMissing(file: string) {
        return !fs.existsSync(file)
    }
}
