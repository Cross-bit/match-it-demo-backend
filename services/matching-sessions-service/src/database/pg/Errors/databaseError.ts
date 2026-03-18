const constants = require("pg-error-constants")


export enum DbErrorMessage {
    RetreivalError = 'Error retrieving data from the database',
    InsertionError = 'Error inserting data into the database',
    DeletionError = 'Error deleting data from the database',
    UpdateError = 'Error updating data in the database'
}

/**
 *
 * This definess custom error for database layer
 *
 */
export default class CustomDatabaseError extends Error {

    public readonly originalError?: Error;
    public readonly errorMessage: DbErrorMessage | string;
    public readonly errorCode: string; // https://www.postgresql.org/docs/current/errcodes-appendix.html


    constructor(errorMessage: DbErrorMessage | string, specificCode: string, originalError?: Error, originator?: string) {
      super(errorMessage);
      this.name = 'DATABASE_ERROR';
      this.errorMessage  = errorMessage;
      this.originalError = originalError;
      this.errorCode = specificCode;
      Object.setPrototypeOf(this, CustomDatabaseError.prototype);
    }

    /**
     * Returns database error messsage in standard format.
     * @returns
     */
    public SerializeMessage() {
      // (use this method for retrieving data to client)
      return {
        dbError: this.errorMessage,
        errorCode: this.errorCode
      }
    }
}

export class ForeignKeyViolation extends CustomDatabaseError {

  public readonly originalError?: Error;

  constructor() {
    const message:string = "Foreign key constraint violation";
    super(message, constants.FOREIGN_KEY_VIOLATION);
    Object.setPrototypeOf(this, ForeignKeyViolation.prototype);
  }
}

export class UniqueViolation extends CustomDatabaseError {

  public readonly originalError?: Error;

  constructor() {
    const message:string = "Value already exists in database";
    super(message, constants.UNIQUE_VIOLATION);
    Object.setPrototypeOf(this, UniqueViolation.prototype);
  }
}
