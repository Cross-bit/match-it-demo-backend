import { DatabaseError, Pool, PoolClient } from 'pg';
import { DbErrorMessage} from './Errors/databaseError'
import * as db1 from './connection_db1';
import { Friendship, NewFriendship, PendingFriendship, PendingFriendshipWithFrineData, UserData } from './interface'


import {
        createPendingFriendRequestQuery, removePendingFriendRequestQuery,
        createNewFriendRelationshipQuery, getPendingFriendRequestsByUserIdQuery,
        getPendingFriendUserDatatsByUserIdQuery
    } from './elementaryQueries/friendShipCreationQueries';

import { getUserByUUIDQuery } from './elementaryQueries/usersSearchQueries';
import { checkFriendshipByUUIDQuery } from './elementaryQueries/friendsManagementQueries';


////////////////////////////////
//          GETTERS           //
////////////////////////////////

export const getPendingRequestsByUserUUID = async (userUUID: string) : Promise<PendingFriendship[] | null> => {
    return db1.executeTransaction(async (client: PoolClient) => {

        const userData =  await getUserByUUIDQuery(client, userUUID);

        if (!userData?.id)
        {
            console.error("User not found");
            return null;
        }

        const pendingRequests = await getPendingFriendRequestsByUserIdQuery(client, userData?.id);
        return pendingRequests;

    }, DbErrorMessage.InsertionError);
}

export const getPendingRequestsByUserId = async (userId: number) : Promise<PendingFriendship[] | null> => {
    return db1.executeTransaction(async (client: PoolClient) => {

        const pendingRequests = await getPendingFriendRequestsByUserIdQuery(client, userId);
        return pendingRequests;

    }, DbErrorMessage.InsertionError);
}

export const getAllPendingUsersByUserUUID = async (userUUID: string) : Promise<PendingFriendshipWithFrineData[] | null> => {
    return db1.executeTransaction(async (client: PoolClient) => {

        const userData =  await getUserByUUIDQuery(client, userUUID);

        if (!userData?.id) {
            console.error("User not found");
            return null;
        }

        const pendingRequests = await getPendingFriendUserDatatsByUserIdQuery(client, userData?.id);
        return pendingRequests;

    }, DbErrorMessage.InsertionError);
}


export const checkFriendshipByUUID = async (userUUID: string, friendUUID: string) : Promise<boolean> => {
    return db1.executeTransaction(async (client: PoolClient) => {
        return await checkFriendshipByUUIDQuery(client, userUUID, friendUUID);

    }, DbErrorMessage.RetreivalError);
}

////////////////////////////////
//         INSERTIONS         //
////////////////////////////////


export const createNewPendingRequest = async (initiatorUUID: string, friendUUID: string) : Promise<PendingFriendship | null> => {
    return db1.executeTransaction(async (client: PoolClient) => {

        const initiator = await getUserByUUIDQuery(client, initiatorUUID);
        const friend = await getUserByUUIDQuery(client, friendUUID);

        if  (!initiator?.id || !friend?.id)
            return null;

        const friendRequest = await createPendingFriendRequestQuery(client, initiator.id, friend.id);

        return friendRequest;

    }, DbErrorMessage.InsertionError);
}


////////////////////////////////
//           UPDATES          //
////////////////////////////////

/**
 *
 * @param request_id
 * @returns NewFriendship
 */
export const tryResolvePendingRequest = async (request_id: string) : Promise<NewFriendship | null> =>
{
    return db1.executeTransaction(async (client: PoolClient) => {

        // delete the original pending request
        const removedPendingReq = await removePendingFriendRequestQuery(client, request_id);

        if (!removedPendingReq) {
            return null;
        }

        // create the new friend relationship
        const newFriendShip = await createNewFriendRelationshipQuery(client, removedPendingReq.user_id, removedPendingReq.friend_id);

        return {
            id: newFriendShip.id,
            uuid: newFriendShip.uuid,
            user_id: removedPendingReq.user_id,
            friend_id: removedPendingReq.friend_id,
            creation_time: newFriendShip.creation_time
        } as NewFriendship;

    }, DbErrorMessage.InsertionError);
}
