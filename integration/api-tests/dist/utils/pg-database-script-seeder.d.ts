/**
 * Creates data seeders for specific postgres databases.
 * Expected to be used to create postgres database seeders.
 */
export declare class PostgresDbSeederFactory {
    static createMainDb1Seeder(): PostgresSeeder;
}
/**
 * Public client's interface for the pg seeder class.
 */
export interface PostgresSeeder {
    /**
     * Seeds database using provided scripts.
     * @param seedScripFile
     */
    setupDatabase(seedScripFile: string | string[]): void;
    /**
     * Cleans all the rows from all the tables (leaves tables and other settings intact).
     */
    cleanupDatabase(): void;
    /**
     * Cleans only seeded database tables (leaves tables and other settings intact).
     */
    /**
     * Allows additional query execution.
     * @param query SQL query
     */
    executeQuery(query: string): void;
}
