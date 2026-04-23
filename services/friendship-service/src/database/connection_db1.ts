import { defaultDatabaseErrorHandler } from "./utils"
import { Pool, PoolClient } from "pg"
import { DbErrorMessage } from "./Errors/databaseError";
import { env } from "../config/env";


export const pool = new Pool({
    user: env.DB_USER,
    host: env.DB_HOST,
    database: env.DB_NAME,
    password: env.DB_PASSWORD,
    ssl: env.USES_SSL ? { rejectUnauthorized: false } : false,
    port: env.DB_PORT,
    max: env.DB_MAX_CONNECTIONS
});

// this signature(defining the type of the query method) allows us to do overloads on it
type QuerySignatures = {
    (query: { text: string; values: any; }): Promise<any>;
    (query: string, params?: any[]): Promise<any>;
  };

  const query:QuerySignatures = async (query, params?: any[]) => await pool.query(query, params)
  export default query;



type errorHanlderDelegate<T> = (err: Error, errMessage: string | DbErrorMessage) => T;
type transactionDelegate<T> = (client: PoolClient) => Promise<T>;

/**
 * Execution wrapper for database functions, which ensures atomicity of databse transactions.
 * (Cleans up additional try catch block)
 * @param funcTransaction Custom user database operaions to perform
 * @param errorMessage Custom user defined error message
 * @param errorHanlder Custom user defined error handler(if not defined the default handler is invoked)
 */
async function ExecuteTransaction<T>
(
  funcTransaction: transactionDelegate<T>,
  errorMessage?: string | DbErrorMessage,
  errorHanlder?: errorHanlderDelegate<T>
): Promise<T>
{

  var client;
  try{
     client = await pool.connect();

  }
  catch(err)
  {
    console.error(err);
    return Promise.reject(err);
  }


  try
  {
      await client.query("BEGIN");
      const transactionResult =  await funcTransaction(client);
      await client.query("COMMIT");

      return transactionResult;
  }
  catch(err)
  {
    await client.query("ROLLBACK");

    const errMsg = errorMessage ? errorMessage : "Database error occured";

    if (errorHanlder)
      errorHanlder(err as Error, errMsg);

    defaultDatabaseErrorHandler(err as Error, errMsg);

    return Promise.reject(err);
  }
  finally
  {
    await client.release();

  }
}

export { ExecuteTransaction as executeTransaction }