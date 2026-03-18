import { PoolClient } from "pg";
import { UserFcmRecordWithUserUUID } from "../types/user.db.types";
import { UserData } from "../types/user.db.types";
import { GroupData } from "../types/group.db.types";

////////////////////////////////
//          INSERTS           //
////////////////////////////////

/**
 * Creates a new group with the given label and adds the specified users into it.
 * Returns the newly created group record.
 */
export const createNewGroupQuery = async (
    client: PoolClient,
    userUUIDs: string[],
    label: string
): Promise<GroupData> => {

    const createGroupQuery = {
        text: `
            INSERT INTO groups (label)
            VALUES ($1)
            RETURNING id, group_uuid, label, creation_time;
        `,
        values: [label]
    };

    const groupResult = await client.query(createGroupQuery);
    const group = groupResult.rows[0] as GroupData;

    const insertRelationsQuery = {
        text: `
            INSERT INTO group_members_relations (group_id, user_uuid)
            VALUES ${userUUIDs.map((_, i) => `($1, $${i + 2})`).join(', ')}
            ON CONFLICT (group_id, user_uuid) DO NOTHING;
        `,
        values: [group.id, ...userUUIDs]
    };

    await client.query(insertRelationsQuery);

    return group;
};


////////////////////////////////
//          GETTERS           //
////////////////////////////////

/**
 * Returns UUIDs of all users belonging to the specified session.
 */
export const getAllUsersUUIDsInSessionQuery = async (
    client: PoolClient,
    sessionUUID: string
): Promise<string[]> => {

    const queryObj = {
        text: 'SELECT msu.user_uuid FROM matching_session_users msu JOIN matching_session ms ON msu.session_id = ms.id WHERE ms.uuid = $1',
        values: [sessionUUID]
    };

    const result = await client.query(queryObj);

    return result.rows.map(r => r.user_uuid);
};

/**
 * Returns FCM records for the given list of user UUIDs.
 */
export const getUsersFCMsByUserUUIDsQuery = async (client: PoolClient, userUUIDS: string[]) : Promise<UserFcmRecordWithUserUUID[]> => {

    const queryObj = {
        text: 'SELECT users.uuid as user_uuid, users_fcm.* FROM users_fcm JOIN users ON users.id = users_fcm.user_id WHERE users.uuid = ANY($1)',
        values: [userUUIDS]
    }

    const result = await client.query(queryObj);

    return result.rows as UserFcmRecordWithUserUUID[]
}

/**
 * Returns user data for the given user UUID, or null if no matching user exists.
 */
export const getUserDataByUserIdQuery = async (client: PoolClient, userUUID: string) : Promise<UserData | null> => {

    const queryObj = {
        text: 'SELECT u.id, u.uuid, u.name, u.email FROM users AS u WHERE u.uuid = $1',
        values: [userUUID]
    }

    const result = await client.query(queryObj);

    const row = result.rows[0];
    if (!row) return null;

    return {
        id: row.id,
        uuid: row.uuid,
        name: row.name,
        email: row.email
    } as UserData
}


/**
 * Finds a group that contains ALL of the given users (it may also contain additional users).
 * Returns null if no such group exists.
 */
export const getGroupByUserUUIDsQuery = async (
    client: PoolClient,
    userUUIDs: string[]
): Promise<GroupData | null> => {

    if (userUUIDs.length === 0) return null;

    const queryObj = {
        text: `
            SELECT g.*
            FROM groups g
            WHERE g.id IN (
                SELECT gm.group_id
                FROM group_members_relations gm
                WHERE gm.user_uuid = ANY($1)
                GROUP BY gm.group_id
                HAVING COUNT(DISTINCT gm.user_uuid) = $2
            )
            LIMIT 1;
        `,
        values: [userUUIDs, userUUIDs.length]
    };


    const result = await client.query(queryObj);
    const row = result.rows[0];

    if (!row) return null;

    return {
        id: row.id,
        group_uuid: row.group_uuid,
        label: row.label,
        creation_time: row.creation_time,
    } satisfies GroupData;
};

