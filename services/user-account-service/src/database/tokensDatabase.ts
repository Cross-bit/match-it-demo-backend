
import { PoolClient } from 'pg';
import * as db1 from './dbConnection'

import { deleteRefreshTokenByUserIdQuery, getRefreshTokenByUserIdQuery, getRefreshTokenRecordIdByUserIdQuery, getRefreshTokenRecordIdQuery, insertRefreshTokenQuery, updateRefreshTokenQuery } from './elementaryQueries/tokenManagementQueries'
import { RefreshTokenRecord } from './interface';


////////////////////////////////
//          INSERTS           //
////////////////////////////////

export const insertNewRefreshTokenQuery = async (userId: number,  newRefreshToken: string) => {
    return db1.executeTransaction( async (client: PoolClient) => {

        const result = await insertRefreshTokenQuery(client, userId, newRefreshToken);

        return result;
    });
}

////////////////////////////////
//          GETTERS           //
////////////////////////////////

/**
 * Tries to get refresh token id from the database. If fails returns -1. TODO: change this to tryGetByUserId
 * @param refreshToken
 * @returns
 */
export const tryGetRefreshTokenId = async (refreshToken: string) : Promise<number>  =>
{
    return db1.executeTransaction(async (client: PoolClient) => {

        return await getRefreshTokenRecordIdQuery(client, refreshToken);
    });
}

/**
 * Attempts to retrieve refresh token record id by [userId]
 * @param userId users specific id
 * @returns number (positive integer or -1 if not found)
 */
export const tryGetRefreshTokenRecordIdByUserId = async (userId: number) : Promise<number>  =>
{
    return db1.executeTransaction(async (client: PoolClient) => {

        return await getRefreshTokenRecordIdByUserIdQuery(client, userId);
    });
}

/**
 * Gets refresh token by users Id from the database by [userId]
 * @param userId users specific id
 * @returns RefreshTokenRecord or null if not found
 */
export const getRefreshTokenRecordByUserId = async (userId: number) : Promise<RefreshTokenRecord | null> =>
{
    return db1.executeTransaction(async (client: PoolClient) => {
        return await getRefreshTokenByUserIdQuery(client, userId);
    });
}

////////////////////////////////
//          UPDATES           //
////////////////////////////////

export const updateCurrentRefreshToken = async (recordId: number, newRefreshToken: string) => {
    return db1.executeTransaction( async (client: PoolClient) => {
        const result = await updateRefreshTokenQuery(client, recordId, newRefreshToken);

        return result;
    });
}

////////////////////////////////
//          DELETES           //
////////////////////////////////

export const deleteRefreshTokenByUserId = async (userId: number) => {
    return db1.executeTransaction( async (client: PoolClient) => {
        await deleteRefreshTokenByUserIdQuery(client, userId);
    });
}