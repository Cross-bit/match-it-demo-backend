import { Friendship, PendingFriendshipWithFrineData } from "../interface";
import { DatabaseError, Pool, PoolClient } from "pg"
import { PendingFriendship } from "../interface"
import logger from "../../logger";




/**
 * Adds new pending relationshipt into pending_requests table
 * @param client
 */
export const createPendingFriendRequestQuery = async (client: PoolClient, userId: number, friendId: number) : Promise<PendingFriendship> =>
{

    const queryObj = {
        text: "INSERT INTO pending_friend_requests (user_id, friend_id) VALUES ($1, $2) RETURNING *",
        values: [userId, friendId]
    }

    const result = await client.query(queryObj);

    if (!result.rows[0] || result.rows.length == 0){
        console.error("Unable to create new pending friend request!!");
        throw Error("Unable to create new pending friend request!!");
    }

    return {
        id: result.rows[0].id,
        uuid: result.rows[0].uuid,
        user_id: result.rows[0].user_id,
        friend_id: result.rows[0].friend_id,
        creation_time: result.rows[0].creation_time,
    } as PendingFriendship;
}


/**
 * Removes pending relationship
 * @param client
 */
export const removePendingFriendRequestQuery = async (client: PoolClient, uuid: string) : Promise<PendingFriendship> =>
{
    const queryObj = {
        text: "DELETE FROM pending_friend_requests WHERE uuid = $1 RETURNING *",
        values: [uuid]
    }

    const result = await client.query(queryObj);

    return {
        id: result.rows[0].id,
        uuid: result.rows[0].uuid,
        user_id: result.rows[0].user_id,
        friend_id: result.rows[0].friend_id,
        creation_time: result.rows[0].creation_time,
    } as PendingFriendship;
}




/**
 * Adds new friends relationship record to the relationship table. (only in one way, it is up to client to do the sematics...)
 * @param client
 */
export const createNewFriendRelationshipQuery = async (client: PoolClient, user1_id: number, user2_id: number) : Promise<Friendship> =>
{

    const queryObj = {
        text: "INSERT INTO users_friends (user1_id, user2_id) VALUES ($1, $2) RETURNING *",
        values: [user1_id, user2_id]
    }

    const result = await client.query(queryObj);

    if (!result.rows[0] || result.rows.length == 0)
    {
        //TODO: make this properly!! this is more like a skeleton so we can return to it later
        // once the app will be running... !!!
        logger.error("Unable to create friend!!");
        throw Error("Unable to create friend!!");
    }


    return {
        id: result.rows[0].id,
        uuid: result.rows[0].uuid,
        user1_id: result.rows[0].user_id,
        user2_id: result.rows[0].friend_id,
        creation_time: result.rows[0].creation_time,
    } as Friendship;
}



export const getPendingFriendRequestsByUserIdQuery = async (client: PoolClient, userId: number) : Promise<PendingFriendship[]> =>
{


    const queryObj = {
        text: "SELECT * FROM pending_friend_requests WHERE friend_id = $1",
        values: [userId]
    }

    const result = await client.query(queryObj);

    return result.rows.map((row: any) => ({
        id: row.id,
        uuid: row.uuid,
        user_id: row.user_id,
        friend_id: row.friend_id,
        creation_time: row.creation_time,
    } as PendingFriendship ) );
}


/**
 * Returns data about the users that send friend request to us.
 * @param client
 * @param userId
 * @returns
 */
export const getPendingFriendUserDatatsByUserIdQuery = async (client: PoolClient, userId: number) : Promise<PendingFriendshipWithFrineData[]> =>
{
    const queryObj = {
        text: "SELECT p.*, u.email, u.uuid AS friend_UUID, u.name from pending_friend_requests AS p LEFT JOIN users AS u ON u.id = p.user_id WHERE friend_id = $1",
        values: [userId]
    }

    const result = await client.query(queryObj);
    logger.info("here mf", result.rows)
    return result.rows.map((row: any) => ({
        id: row.id,
        uuid: row.uuid,
        user_id: row.user_id,
        friend_data: {
            id: row.friend_id,
            uid: row.friend_uuid,
            name: row.name,
            email: row.email
        },
        creation_time: row.creation_time
    } as PendingFriendshipWithFrineData ) );
}


