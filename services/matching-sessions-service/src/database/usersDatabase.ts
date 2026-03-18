import { PoolClient } from 'pg';
import { getUserDataByUserIdQuery, getUsersFCMsByUserUUIDsQuery, getGroupByUserUUIDsQuery, createNewGroupQuery } from './pg/elementaryQueries/sessionUsersQueries';
import * as db from './pg/dbConnection';
import { UserFcmRecordWithUserUUID } from "./pg/types/user.db.types";
import { UserData } from "./pg/types/user.db.types";
import { GroupData } from "./pg/types/group.db.types";


////////////////////////////////
//          GETTERS           //
////////////////////////////////

/**
 * Returns FCM records for the given list of user UUIDs.
 */
export const getUsersFcmsByUserUUIDs = async (userUUIDS: string[]) : Promise<UserFcmRecordWithUserUUID[]> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        const result = await getUsersFCMsByUserUUIDsQuery(client, userUUIDS);
        return result;
    });
}

/**
 * Returns user data for the given UUID, or null if the user does not exist.
 */
export const getUserDataByUserUUID = async (userUUID: string) : Promise<UserData | null> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        const result = await getUserDataByUserIdQuery(client, userUUID);
        return result;
    });
}

/**
 * Attempts to find a group that contains all given users.
 * Returns the group or null if none exists.
 */
export const tryGetGroupByUserUUIDs = async (userUUIDs: string[]) : Promise<GroupData | null> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        const result = await getGroupByUserUUIDsQuery(client, userUUIDs);
        return result;
    });
}

////////////////////////////////
//         INSERTIONS         //
////////////////////////////////

/**
 * Uploads the given file to Google Cloud Storage and returns metadata about the stored image.
 */
export const createNewGroup = async (userUUIDs: string[], groupLabel: string) : Promise<GroupData | null> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        const result = await createNewGroupQuery(client, userUUIDs, groupLabel);
        return result;
    });
}


