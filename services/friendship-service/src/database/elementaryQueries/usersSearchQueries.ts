import { UserData, SearchedUserData } from "../interface";
import { PoolClient } from "pg"

/**
 * Specifies all queries for global users search
 *  (e.g. for friends search in all users etc...)
 */

// TODO: https://github.com/Cross-bit/match-it-backend/issues/16

// Get user by email and check if they are friends with the user with the given id
export const getUserByEmailQuery = async (client: PoolClient, initiatorUUID: string, email: string): Promise<SearchedUserData | null> => {

    // Query to get user by email
    const queryObj = {
        text: `
            SELECT
                id,
                uuid,
                name,
                email
            FROM
                users
            WHERE
                email = $1
            `,
        values: [email]
    }

    const queryRes = await client.query(queryObj);

    // If no user is found, return null
    if  (queryRes.rowCount == 0)
        return null;

    const queryGetUserId = {
        text: `
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $1
            `,
        values: [initiatorUUID]
    }

    const initiatorId = await client.query(queryGetUserId);

    // Query to check if the user with the given id is friends with the user found by the previous query
    const friendQueryObj = {
        text: `
            SELECT
                COUNT(*)
            FROM
                users_friends
            WHERE
                (user1_id = $1 AND user2_id = $2) OR
                (user1_id = $2 AND user2_id = $1)
            `,
        values: [initiatorId.rows[0].id, queryRes.rows[0].id]
    }

    const friendQueryRes = await client.query(friendQueryObj);

    // If the count is greater than 0, the users are friends
    const isFriend = friendQueryRes.rows[0].count > 0;

    return {
        id: queryRes.rows[0].id,
        uid: queryRes.rows[0].uuid,
        name: queryRes.rows[0].name,
        email: queryRes.rows[0].email,
        isFriend: isFriend
    };
}

export const getUserByIdQuery = async (client: PoolClient, id: number) : Promise<UserData | null> =>
{
    const queryObj = {
        text: `
            SELECT
                uuid,
                name,
                email
            FROM
                users
            WHERE
                id = $1
            `,
        values: [id]
    }

    const queryRes = await client.query(queryObj);

    if  (queryRes.rowCount == 0)
        return null;

    return {
        id: id,
        uid: queryRes.rows[0].uid,
        name: queryRes.rows[0].name,
        email: queryRes.rows[0].email
    };
}

export const getUserIdByUUIDQuery = async (client: PoolClient, uuid: string) : Promise<number | null> =>
{
    const queryObj = {
        text: `
            SELECT
                id
            FROM
                users
            WHERE
                uuid = $1
            `,
        values: [uuid]
    }

    const queryRes = await client.query(queryObj);

    if  (queryRes.rowCount == 0)
        return null;

    return queryRes.rows[0].id
}


export const getUserByUUIDQuery = async (client: PoolClient, uuid: string) : Promise<UserData | null> =>
{
    const queryObj = {
        text: `
            SELECT
                id,
                uuid,
                name,
                email
            FROM
                users
            WHERE
                uuid = $1
            `,
        values: [uuid]
    }

    const queryRes = await client.query(queryObj);

    if  (queryRes.rowCount == 0)
        return null;

    return {
        id: queryRes.rows[0].id,
        uid: queryRes.rows[0].uuid,
        name: queryRes.rows[0].name,
        email: queryRes.rows[0].email
    };
}

