import {PoolClient} from "pg"
import { RefreshTokenRecord } from "../interface"


////////////////////////////////
//          INSERTS           //
////////////////////////////////

export const insertRefreshTokenQuery = async (client: PoolClient, userId: number, newRefreshToken: string) => {

        const queryObj = {
            text: "INSERT INTO users_refresh_tokens (user_id, refresh_token) VALUES($1, $2)",
            values: [userId, newRefreshToken]
        }

        await client.query(queryObj);
}

////////////////////////////////
//          GETTERS           //
////////////////////////////////

/**
 * Gets refresh token record id by [refreshToken].
*/
export const getRefreshTokenRecordIdQuery = async (client: PoolClient, refreshToken: string) : Promise<number> =>
{
    const queryObj = {
        text: "SELECT id FROM users_refresh_tokens WHERE refresh_token = $1 ",
        values: [refreshToken]
    }

    const result = await client.query(queryObj);

    if (result.rows.length > 1) {
        throw new Error("Upps multiple rows with the same refresh token in database!!!");
    }

    return result.rows.length == 1 ? result.rows[0] : -1;
}

/**
 * Gets refresh token data by [userId]. Returns -1 if not found.
*/
export const getRefreshTokenRecordIdByUserIdQuery = async (client: PoolClient, userId: number) : Promise<number> =>
{
    const queryObj = {
        text: "SELECT id FROM users_refresh_tokens WHERE user_id = $1 ",
        values: [userId]
    }

    const result = await client.query(queryObj);

    if (result.rows.length > 1) {
        throw new Error("Upps multiple rows with the same refresh token in database!!!");
    }

    return result.rows.length == 1 ? result.rows[0].id : -1;
}

/**
 * Get refresh token by user id [recordId].
 */
export const getRefreshTokenByUserIdQuery = async (client: PoolClient, userId: number) : Promise<RefreshTokenRecord | null> =>
{
    const queryObj = {
        text: "SELECT * FROM users_refresh_tokens WHERE user_id = $1 ",
        values: [userId]
    }

    const result = await client.query(queryObj);

    return result.rows.length > 0 ? result.rows[0] : null;
}

////////////////////////////////
//          UPDATES           //
////////////////////////////////

/**
 * Update refresh token by it's [recordId].
 */
export const updateRefreshTokenQuery = async (client: PoolClient, recordId: number, newRefreshToken: string) =>
{

    const queryObj = {
        text: "UPDATE users_refresh_tokens SET refresh_token = $1 WHERE id = $2",
        values: [newRefreshToken, recordId]
    }

    await client.query(queryObj);
}

////////////////////////////////
//          DELETES           //
////////////////////////////////

/**
 * Delete refresh token by [userId].
 */
export const deleteRefreshTokenByUserIdQuery = async (client: PoolClient, userId: number) =>
{

    const queryObj = {
        text: "DELETE FROM users_refresh_tokens WHERE user_id = $1",
        values: [userId]
    }

    await client.query(queryObj);

}

/**
 * Delete all refresh tokens.
*/
export const deleteAllRefreshTokensQuery = async (client: PoolClient) =>
{

    const queryObj = {
        text: "DELETE FROM users_refresh_tokens"
    }

    await client.query(queryObj);
}