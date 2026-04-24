import * as path from 'path';
import fs, { writeFileSync } from 'fs';
import { sqlToTypeOrmEntities } from './database/type-orm-entities/entities-generator';
import { join } from 'path';
import * as settings from "./generalSettings"

async function generateEntities() {
    // Path original .sql files with tables definitions
    const DB_TABLE_SCRIPTS = join(settings.PROJECT_ROOT, "databases/postgresql/db1/init/")
    const ENTITIES_OUT_DIR = join(__dirname, "database/type-orm-entities/entities")

    const filesNames = fs.readdirSync(DB_TABLE_SCRIPTS)
    .filter(file => file.endsWith('.sql')) // Ensure we only get .sql files
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(1);

    for (const fileName of filesNames) {
    const filePath = join(DB_TABLE_SCRIPTS, fileName)


    sqlToTypeOrmEntities(filePath, ENTITIES_OUT_DIR);
    }

}

// Export the function as required by Jest's globalSetup
module.exports = generateEntities;