import {PoolClient} from "pg"
import { FcmTokenRecord } from "../interface";



////////////////////////////////
//          GETTERS           //
////////////////////////////////

/**
 * Gets users fcm token by provided arr of [userIds]
 */
export const getUsersFCMTokenQuery = async (client: PoolClient, userIds: number[]) : Promise<FcmTokenRecord[]> => {
    const queryObj = {
        text: "SELECT * FROM users_fcm WHERE user_id = ANY($1)",
        values: [userIds]
    }

    const result = await client.query(queryObj);

    const res = result.rows;

    return res as FcmTokenRecord[];
}

////////////////////////////////
//          UPDATES           //
////////////////////////////////

/**
 * Updates users FCM token [fcmToken] by [userId].
 */
/*export const updateUsersFCMTokenQuery = async (client: PoolClient, userId: number, fcmToken: string) : Promise<number> => {

    const queryObj = {
        text: "INSERT INTO users_fcm (user_id, fcm_token) VALUES ($1, $2) ON CONFLICT(user_id) DO UPDATE SET fcm_token = EXCLUDED.fcm_token RETURNING id",
        values: [userId, fcmToken]
    }

    const result = await client.query(queryObj);

    return result.rows[0].id;
    return 1;
}*/

export const insertUsersFCMTokenQuery = async (client: PoolClient, userId: number, fcmToken: string) : Promise<number> => {

    const queryObj = {
        text: "INSERT INTO users_fcm (user_id, fcm_token) VALUES ($1, $2) RETURNING id",
        values: [userId, fcmToken]
    }

    const result = await client.query(queryObj);

    return result.rows[0].id;
}


////////////////////////////////
//          DELETES           //
////////////////////////////////

/**
 * Deletes all FCM records from the database
*/
export const deleteAllFCMTokens = async (client: PoolClient) =>
{
    const queryObj = {
        text: "DELETE FROM users_fcm",
    }

    await client.query(queryObj);
}

/**
 * Deletes all records with given [fcmToken]
 */
export const deleteAllRecordsWithGivenFCMTokenQuery = async (client: PoolClient, fcmToken: string) =>
{
    const queryObj = {
        text: "DELETE FROM users_fcm WHERE fcm_token = $1",
        values: [fcmToken]
    }

    await client.query(queryObj);
}


/**
 * Deletes all records with given [fcmToken]
 */
export const deleteFCMByUserIdQuery = async (client: PoolClient, userId: number) =>
    {
        const queryObj = {
            text: "DELETE FROM users_fcm WHERE user_id = $1",
            values: [userId]
        }

        await client.query(queryObj);
    }
