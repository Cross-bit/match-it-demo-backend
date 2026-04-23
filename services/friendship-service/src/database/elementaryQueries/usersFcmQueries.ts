import { Friendship, PendingFriendshipWithFrineData, UserData, UserFcmRecordWithUserUUID } from "../interface";
import { PoolClient } from "pg"


export const getUsersFCMsByUserUUIDsQuery = async (client: PoolClient, userUUIDS: string[]) : Promise<UserFcmRecordWithUserUUID[]> => {
    const queryObj = {
        text: 'SELECT users.name, users.uuid as user_uuid, users_fcm.* FROM users_fcm JOIN users ON users.id = users_fcm.user_id WHERE users.uuid = ANY($1)',
        values: [userUUIDS]
    }

    const result = await client.query(queryObj);

    return result.rows as UserFcmRecordWithUserUUID[]
}