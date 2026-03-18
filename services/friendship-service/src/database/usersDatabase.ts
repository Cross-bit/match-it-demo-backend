
import { DatabaseError, PoolClient } from 'pg';
import * as db1 from './connection_db1';
import { SearchedUserData, UserData, UserFcmRecordWithUserUUID } from './interface'


import { getUserByEmailQuery, getUserByIdQuery, getUserByUUIDQuery, getUserIdByUUIDQuery } from './elementaryQueries/usersSearchQueries';
import { getAllFriendsByIdQuery } from './elementaryQueries/friendsManagementQueries';
import { getUsersFCMsByUserUUIDsQuery } from './elementaryQueries/usersFcmQueries'

////////////////////////////////
//          GETTERS           //
////////////////////////////////

export const getAllFriendsByUUID = async (userUUID: string) : Promise<UserData[] | null> =>
{
    return db1.executeTransaction(async (client: PoolClient) => {
        const user = await getUserByUUIDQuery(client, userUUID);

        if (user == null)
            return null;

        const friendsData = await getAllFriendsByIdQuery(client, user.id);

        return friendsData;

    });

}

export const getUserById = async (userId: number) => {

    return db1.executeTransaction(async (client: PoolClient) => {
        const friendData = await getUserByIdQuery(client, userId);

        return friendData;
    });
}

export const searchUserByEmail = async (initiatorUUID: string, email: string) : Promise<SearchedUserData | null> => {
    return db1.executeTransaction(async (client: PoolClient) => {
        const friendData = await getUserByEmailQuery(client, initiatorUUID, email);
        return friendData;
    });
}

export const getUserIdByUUID = async (uuid: string) : Promise<number | null> =>
{
    return db1.executeTransaction(async (client: PoolClient) => {
        const friendData = await getUserIdByUUIDQuery(client, uuid);
        return friendData;
    });
}



export const getUserFcmDataByUUIDs = async (uuids: string[]) : Promise<UserFcmRecordWithUserUUID[]> => {
    return db1.executeTransaction(async (client: PoolClient) => {
        return await getUsersFCMsByUserUUIDsQuery(client, uuids);
    });
}


////////////////////////////////
//         INSERTIONS         //
////////////////////////////////

////////////////////////////////
//           UPDATES          //
////////////////////////////////

///////////////////////////////////
//           Deletions           //
///////////////////////////////////


export const removeFriendByUserUUID = async (userUUID: string) : Promise<UserData[] | null> =>
{
    return db1.executeTransaction(async (client: PoolClient) => {
        const user = await getUserByUUIDQuery(client, userUUID);

        if (user == null)
            return null;

        const friendsData = await getAllFriendsByIdQuery(client, user.id);

        return friendsData;

    });

}
