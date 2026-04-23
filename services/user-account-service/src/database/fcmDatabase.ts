
import { PoolClient } from 'pg';
import * as db1 from './dbConnection'
import { deleteAllRecordsWithGivenFCMTokenQuery, deleteFCMByUserIdQuery, insertUsersFCMTokenQuery } from './elementaryQueries/fcmTokenQueries';


/**
 * Tries to update users Fcm token, if failes inserts the new record.
 * @param fcmToken
 * @returns
 */
export const updateUserFCMToken = async (userId: number, fcmToken: string) : Promise<number>  =>
{
    return db1.executeTransaction(async (client: PoolClient) => {

        // first delete all records with incoming token
        // different account is logging in from the same device (if the token wasn't deleted properly)
        await deleteAllRecordsWithGivenFCMTokenQuery(client, fcmToken)

        await deleteFCMByUserIdQuery(client, userId)
        return await insertUsersFCMTokenQuery(client,userId, fcmToken)
    });
}

/**
 * Deletes fcm token by user id
 * @param userId
 * @returns
 */
export const deleteFcmRecordByUserId = async (userId: number) : Promise<void>  => {
    return db1.executeTransaction(async (client: PoolClient) => {
        await deleteFCMByUserIdQuery(client, userId)

    });
}

