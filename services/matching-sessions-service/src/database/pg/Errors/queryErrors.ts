



//TODO:
/*export default class DatabaseQueryError extends Error
{
    public readonly originalError?: Error;
    public readonly errorMessage: string;
    public readonly errorCode: string; // https://www.postgresql.org/docs/current/errcodes-appendix.html


    constructor (errorMessage: string, originalError?: Error, originator?: string) {
      super(errorMessage);
      this.name = 'DATABASE_ERROR';
      this.errorMessage  = errorMessage;
      this.originalError = originalError;
      Object.setPrototypeOf(this, DatabaseQueryError.prototype);
    }
}

export enum QueryErrorMessage { ALL_QUERY_ARGS_NULL }

export class DatabaseInvalidArgsError extends DatabaseQueryError
{
    public readonly originalError?: Error;
    public readonly errorMessage: QueryErrorMessage | string
    public readonly errorCode: string; // https://www.postgresql.org/docs/current/errcodes-appendix.html


    constructor (errorMessage: QueryErrorMessage | string, originalError?: Error, originator?: string) 
    {
      this.name = 'DATABASE_ERROR';
      this.errorMessage  = errorMessage;
      this.originalError = originalError;
      this.errorCode = specificCode;
      Object.setPrototypeOf(this, CustomDatabaseError.prototype);
    }
}*/