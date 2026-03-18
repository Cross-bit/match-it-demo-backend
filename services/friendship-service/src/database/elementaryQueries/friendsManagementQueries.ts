import { Friendship, PendingFriendshipWithFrineData, UserData } from "../interface";
import { DatabaseError, Pool, PoolClient } from "pg"
import { PendingFriendship } from "../interface"
import logger from "../../logger";



// note this is pretty expensive operation and should be cached in the frontend as possible!!
export const getAllFriendsByIdQuery = async (client: PoolClient, userId: number): Promise<UserData[] | null> => {

    // again note there is difference between uuid and id!!!
    // uuid is long globally universal id, but id is just our internal primary key
    // that we use for faster tables joining end data manipulation !!!

    //TODO: maybe add that we want to query only users with specific privilidges??
    const queryObj = {
        text: `
            SELECT
                u.id,
                u.uuid,
                u.name,
                u.email
            FROM
                users u
            JOIN users_friends f ON f.user1_id = u.id OR f.user2_id = u.id
            WHERE
                (f.user1_id = $1 OR f.user2_id = $1) AND u.id != $1
            `,
        values: [userId]
    }

    const queryRes = await client.query(queryObj);

    if  (queryRes.rowCount == 0)
        return null;

    return queryRes.rows.map((row: any) => ({
        id: row.id,
        uid: row.uuid,
        name: row.name,
        email: row.email
    } as UserData ))

}

export const checkFriendshipByUUIDQuery = async (
    client: PoolClient,
    userUUID: string,
    friendUUID: string
): Promise<boolean> => {

    const queryObj = {
        text: `
            SELECT 1
            FROM users_friends f
            JOIN users u1 ON u1.id = f.user1_id
            JOIN users u2 ON u2.id = f.user2_id
            WHERE
                (u1.uuid = $1 AND u2.uuid = $2)
                OR
                (u1.uuid = $2 AND u2.uuid = $1)
            LIMIT 1
        `,
        values: [userUUID, friendUUID]
    };

    const res = await client.query(queryObj);

    return res.rows.length > 0;
};