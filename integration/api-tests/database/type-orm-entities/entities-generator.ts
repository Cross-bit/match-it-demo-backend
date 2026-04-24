/**=====================================================
 * DESCRIPTION
 * =====================================================
 * Converts SQL table definitions, defined in the .sql files
 * to typeorm entities.
 */


import * as settings from '../../generalSettings'
import { fstat, readFileSync, writeFileSync } from 'fs';
import { Parser, Create, ColumnRefItem } from 'node-sql-parser';
import { join } from 'path';
import fs from 'fs';

const parser = new Parser();

// enum definitions found so far
const existing_enums = new Map<string, string[]>
const ENUM_SCRIPT_FILE_NAME = "custom_enums.ts"
const ENUM_SCRIPT_IMPORT_ALIAS = "types"

type enumType = {type: string, value: {type: string, value: string}[], parentheses: boolean}

export function sqlToTypeOrmEntities(sqlFilePath: string, outputDir: string): void {
  const sqlContent = readFileSync(sqlFilePath, 'utf-8');
  let ast;
  try {
    ast = parser.astify(sqlContent, {database: 'PostgreSQL'});
  } catch (e) {
    console.warn(`[entities-generator] Skipping file due to parse error: ${sqlFilePath}`);
    console.warn(e);
    return;
  }

  //console.log('Full AST:', JSON.stringify(ast, null, 2));

  // parse all the SQL queries in the file
  const queries = Array.isArray(ast) ? ast : [ast];

  for (let query of queries) {

    // ugh ... it adds new type called "type" for enum definition for which it does not have interface ..
    type CreateWithName = Create & { name:  { schema: null, name: 'userAuthenticationMethod' } };

    // parse enum definition (it must be parsed before other queries)
    if (query.type === 'create' && (query.keyword as string) === 'type') {

      const enumName = (query as CreateWithName).name.name.toLocaleLowerCase();
      existing_enums.set(enumName, [])

      if (query.create_definitions) {
        const enum_definition = query.create_definitions as unknown as enumType

        for (const definition of enum_definition.value) {
          (existing_enums.get(enumName) as string[]).push(definition.value)
        }
      }
    }

    // parse table creation to new entities
    if (query.type === 'create' && query.keyword === 'table') {

      query = query as Create

      if (!query.table)
        continue


      const tableName = query.table?.[0].table;

      let entityCode = `import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';\n`;

      if (existing_enums.size > 0) {
        entityCode += `import * as ${ENUM_SCRIPT_IMPORT_ALIAS} from \'./${ ENUM_SCRIPT_FILE_NAME.split('.')[0] }\'\n`;
      }

      entityCode += '\n'

      entityCode += `@Entity('${tableName}')\nexport class ${capitalize(tableName)} {\n`;

      if (query.create_definitions && Array.isArray(query.create_definitions)) {
        for (const definition of query.create_definitions) {

          // Handle column definitions
          if (definition && 'column' in definition) {

            const colData = (definition.column as ColumnRefItem).column

            if (typeof colData != 'object')
                throw Error("Col data is not a object")

            const colName = colData?.expr.value as string
            const colType = definition.definition?.dataType?.toLowerCase();

            if (!colName || !colType) continue; // Skip if we can’t get name or type

            let typeOrmType = mapSqlTypeToTypeOrm(colType);

            // every table has the id column, so leave it there with the correct definition
            if (colName === 'id' && colType === 'serial') {
              entityCode += `  @PrimaryGeneratedColumn({type: 'int'})\n  ${colName}!: number;\n\n`;
            } else {

              let columnOptions = `{ name: '${colName}'`;

              if (definition.nullable?.type === 'not null') columnOptions += `, nullable: false`;

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

      const outputFile = join(outputDir, `${tableName}.ts`);
      writeFileSync(outputFile, entityCode, 'utf-8');
      console.log(`Generated entity in ${outputFile}`);
    }

    if (existing_enums.size > 0)
    {
      const outputFile = join(outputDir, `./${ENUM_SCRIPT_FILE_NAME}`);
      generateEnumFile(outputFile)
      console.log(`Generated enums file ${outputFile}`);
    }
  }
}

function generateEnumFile(outputFile: string) {

  // no enums addee
  if (existing_enums.size == 0)
    return

  let output = ""

  // create definition for every enum
  for (const [name, values] of existing_enums) {


    output += `export enum ${name} { `

    for(const [i, value] of values.entries()) {
      output += `${value} = \"${value}\"${(i < values.length -1) ? ',' : ''} `
    }

    output += '};\n'

  }

  writeFileSync(outputFile, output, 'utf-8');


}

function mapSqlTypeToTypeOrm(sqlType: string): string {
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

function mapTypeToTs(sqlType: string): string {

  sqlType = sqlType.toLocaleLowerCase()
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

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


// Intentionally no side effects on module import.
// Entity generation should be invoked explicitly from the integration Jest global setup.

