"use strict";
/**=====================================================
 * DESCRIPTION
 * =====================================================
 * Converts SQL table definitions, defined in the .sql files
 * to typeorm entities.
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlToTypeOrmEntities = sqlToTypeOrmEntities;
const settings = __importStar(require("../../generalSettings"));
const fs_1 = require("fs");
const node_sql_parser_1 = require("node-sql-parser");
const path_1 = require("path");
const fs_2 = __importDefault(require("fs"));
const parser = new node_sql_parser_1.Parser();
// enum definitions found so far
const existing_enums = new Map;
const ENUM_SCRIPT_FILE_NAME = "custom_enums.ts";
const ENUM_SCRIPT_IMPORT_ALIAS = "types";
function sqlToTypeOrmEntities(sqlFilePath, outputDir) {
    var _a, _b, _c, _d;
    const sqlContent = (0, fs_1.readFileSync)(sqlFilePath, 'utf-8');
    const ast = parser.astify(sqlContent, { database: 'PostgreSQL' });
    //console.log('Full AST:', JSON.stringify(ast, null, 2));
    // parse all the SQL queries in the file
    const queries = Array.isArray(ast) ? ast : [ast];
    for (let query of queries) {
        // parse enum definition (it must be parsed before other queries)
        if (query.type === 'create' && query.keyword === 'type') {
            const enumName = query.name.name.toLocaleLowerCase();
            existing_enums.set(enumName, []);
            if (query.create_definitions) {
                const enum_definition = query.create_definitions;
                for (const definition of enum_definition.value) {
                    existing_enums.get(enumName).push(definition.value);
                }
            }
        }
        // parse table creation to new entities
        if (query.type === 'create' && query.keyword === 'table') {
            query = query;
            if (!query.table)
                continue;
            const tableName = (_a = query.table) === null || _a === void 0 ? void 0 : _a[0].table;
            let entityCode = `import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';\n`;
            if (existing_enums.size > 0) {
                entityCode += `import * as ${ENUM_SCRIPT_IMPORT_ALIAS} from \'./${ENUM_SCRIPT_FILE_NAME.split('.')[0]}\'\n`;
            }
            entityCode += '\n';
            entityCode += `@Entity('${tableName}')\nexport class ${capitalize(tableName)} {\n`;
            if (query.create_definitions && Array.isArray(query.create_definitions)) {
                for (const definition of query.create_definitions) {
                    // Handle column definitions
                    if (definition && 'column' in definition) {
                        const colData = definition.column.column;
                        if (typeof colData != 'object')
                            throw Error("Col data is not a object");
                        const colName = colData === null || colData === void 0 ? void 0 : colData.expr.value;
                        const colType = (_c = (_b = definition.definition) === null || _b === void 0 ? void 0 : _b.dataType) === null || _c === void 0 ? void 0 : _c.toLowerCase();
                        if (!colName || !colType)
                            continue; // Skip if we can’t get name or type
                        let typeOrmType = mapSqlTypeToTypeOrm(colType);
                        // every table has the id column, so leave it there with the correct definition
                        if (colName === 'id' && colType === 'serial') {
                            entityCode += `  @PrimaryGeneratedColumn({type: 'int'})\n  ${colName}!: number;\n\n`;
                        }
                        else {
                            let columnOptions = `{ name: '${colName}'`;
                            if (((_d = definition.nullable) === null || _d === void 0 ? void 0 : _d.type) === 'not null')
                                columnOptions += `, nullable: false`;
                            /*if (definition.default_val) {
                              const defaultValue = definition.default_val.value;
                              columnOptions += `, default: () => ${
                                typeof defaultValue === 'string' ? `'${defaultValue}'` : defaultValue
                              }`;
                            }*/
                            columnOptions += ` }`;
                            // special case for TYPE
                            if (existing_enums.get(typeOrmType))
                                entityCode += `  @Column({type: 'enum', enum: ${ENUM_SCRIPT_IMPORT_ALIAS}.${typeOrmType} })\n  ${colName}!: ${ENUM_SCRIPT_IMPORT_ALIAS}.${typeOrmType};\n\n`;
                            else // general case
                                entityCode += `  @Column('${typeOrmType}', ${columnOptions})\n  ${colName}!: ${mapTypeToTs(colType)};\n\n`;
                        }
                    }
                    // + Ignore non-column definitions (e.g., constraints, indexes) for now
                }
            }
            entityCode += `}\n`;
            const outputFile = (0, path_1.join)(outputDir, `${tableName}.ts`);
            (0, fs_1.writeFileSync)(outputFile, entityCode, 'utf-8');
            console.log(`Generated entity in ${outputFile}`);
        }
        if (existing_enums.size > 0) {
            const outputFile = (0, path_1.join)(outputDir, `./${ENUM_SCRIPT_FILE_NAME}`);
            generateEnumFile(outputFile);
            console.log(`Generated enums file ${outputFile}`);
        }
    }
}
function generateEnumFile(outputFile) {
    // no enums addee
    if (existing_enums.size == 0)
        return;
    let output = "";
    // create definition for every enum
    for (const [name, values] of existing_enums) {
        output += `export enum ${name} { `;
        for (const [i, value] of values.entries()) {
            output += `${value} = \"${value}\"${(i < values.length - 1) ? ',' : ''} `;
        }
        output += '};\n';
    }
    (0, fs_1.writeFileSync)(outputFile, output, 'utf-8');
}
function mapSqlTypeToTypeOrm(sqlType) {
    switch (sqlType) {
        case 'serial': return 'integer';
        case 'uuid': return 'uuid';
        case 'varchar': return 'character varying';
        case 'bigint': return 'bigint';
        case 'timestamp': return 'varchar'; // it is important for this to be a string; timestamp:timestamp could cause wrong conversion from ISO ()
        case 'enum': return 'enum';
        default: return sqlType;
    }
}
function mapTypeToTs(sqlType) {
    sqlType = sqlType.toLocaleLowerCase();
    switch (sqlType) {
        case 'serial': return 'number';
        case 'uuid': return 'string';
        case 'varchar': return 'string';
        case 'bigint': return 'number';
        case 'timestamp': return 'string'; // it is important for this to be a string; Date could cause wrong conversion from ISO
        case 'enum': return 'string';
        default: return 'any';
    }
}
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
// Path original .sql files with tables definitions
const DB_TABLE_SCRIPTS = (0, path_1.join)(settings.PROJECT_ROOT, "databases/postgresql/db1/init/");
const ENTITIES_OUT_DIR = (0, path_1.join)(__dirname, "entities");
const filesNames = fs_2.default.readdirSync(DB_TABLE_SCRIPTS)
    .filter(file => file.endsWith('.sql')) // Ensure we only get .sql files
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).slice(1);
for (const fileName of filesNames) {
    const filePath = (0, path_1.join)(DB_TABLE_SCRIPTS, fileName);
    sqlToTypeOrmEntities(filePath, ENTITIES_OUT_DIR);
}
