import { UserExistQuery } from "../interface"
import CustomDatabaseError from "../Errors/databaseError"
import { PoolClient } from "pg";


/**
 * Checks whether user with given properties exists in the database.
 * @param query
 * @param useConjunction Specifies wheter all the non-null properties
 * @error if all values of query object are null throws error.
 * @returns boolean whether user record exists or not
 */
export const checkUserExistByEmail = async (client: PoolClient, query: UserExistQuery, useConjunction: boolean = true) : Promise<boolean> =>
{
    let queryStr = "SELECT EXISTS ( SELECT 1 FROM users "

    const queryParams: string[] = [];
    const queryValues: any[] = [];

    if (query.id) {
        queryValues.push(query.id);
        queryParams.push(`id = $${queryValues.length}`);
    }

    if (query.uid) {
        queryValues.push(query.uid);
        queryParams.push(`token = $${queryValues.length}`);
    }

    if (query.email) {
        queryValues.push(query.email);
        queryParams.push(`email = $${queryValues.length}`);
    }

    if (queryParams.length == 0)  {
        console.error("All user query search params null! At least one has to be set...");
        throw new Error("All user query search params null! At least one has to be set...");
    }

    const mergeOperator =  useConjunction ? "AND" : "OR";

    const queryMerged = queryParams.join(` ${mergeOperator} `);

    queryStr += " WHERE " + queryMerged + " )";

    const queryObj = { text: queryStr, values: queryValues };


    const result = await client.query(queryObj);

    // NOTE: fallback to false keeps this helper safe for malformed/empty query results.
    return result.rows[0]?.exists ? result.rows[0]?.exists : false;
}

/**
 * Checks whether user with given properties exists in the database.
 * @param query
 * @param useConjunction Specifies wheter all the non-null properties
 * @error if all values of query object are null throws error.
 * @returns boolean whether user record exists or not
 */
export const deleteUserAccount = async (client: PoolClient, userId: number) : Promise<boolean> =>
{
    const queryObj = {
        text: `DELETE FROM users WHERE id = $1 RETURNING *`,
        values: [userId]
    }

    const queryRes = await client.query(queryObj);
    return queryRes.rows[0]?.exists ? queryRes.rows[0]?.exists : false;
}

/**
 * Checks if given user is verified
 *
 *
 * @param client
 * @param userIds
 * @returns
 */
/*export const getVerifiedUsersFCMTokenQuery = async (
  client: PoolClient,
  userIds: number[]
): Promise<FcmTokenRecord[]> => {
  const queryObj = {
    text: `
      SELECT uf.*
      FROM users_fcm uf
      JOIN users u ON u.id = uf.user_id
      WHERE uf.user_id = ANY($1)
        AND u.is_verified = TRUE
    `,
    values: [userIds],
  };

  const result = await client.query(queryObj);
  return result.rows as FcmTokenRecord[];
};*/
