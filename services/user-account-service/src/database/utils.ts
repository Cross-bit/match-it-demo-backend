import { DatabaseError } from 'pg-protocol';
import CustomDatabaseError, { DbErrorMessage, ForeignKeyViolation, UniqueViolation } from './Errors/databaseError'


const pgErrors = require("pg-error-constants");


export const defaultDatabaseErrorHandler = (error: Error, errorType: DbErrorMessage | string, log:boolean = true) => {

    if (log)
      console.error(error);

    if (error instanceof DatabaseError && error.code) {

      switch(error.code) {
        case pgErrors.FOREIGN_KEY_VIOLATION:
          throw new ForeignKeyViolation();
        case pgErrors.UNIQUE_VIOLATION:
            throw new UniqueViolation();
        default:
          throw new CustomDatabaseError(errorType, error.code);
      }
    }

    throw error
};