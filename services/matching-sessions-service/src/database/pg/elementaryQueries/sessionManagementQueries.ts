import { PoolClient } from "pg"
import { CreateMatchingSession, CreateMatchResult, CreateSessionUser, MatchResult } from "../types/session.db.types"
import { MatchingSession, SessionUser } from "../types/session.db.types"
import { SessionType, SessionState } from "../../../interface"
import { VotingResult } from "../../../services/types"



////////////////////////////////
//          INSERTS           //
////////////////////////////////

/**
 * Inserts a new user-session relation and returns the created SessionUser record.
 * Throws an error if the insert failed.
 */
export const insertUserToSessionQuery = async (client: PoolClient, userData: CreateSessionUser) : Promise<SessionUser> => {

    const queryObj = {
        text: 'INSERT INTO matching_session_users (session_id, user_uuid, is_connected, is_creator, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        values: [userData.session_id, userData.user_uuid, userData.is_connected, userData.is_creator, userData.metadata]
    }

    const result = await client.query(queryObj);

    if (!result.rows || result.rows.length == 0) {
        console.error("User couldn't be inserted to the database. 0 rows inserted");
        throw new Error("User couldn't be inserted to the database. 0 rows inserted");
    }

    const userId = result.rows[0].id;

    return {
        id: userId,
        ...userData,
    } as SessionUser;
}

/**
 * Inserts multiple matched items (winners / candidates) and returns created MatchResult records.
 * Throws an error if the insert failed.
 */
export const insertMatchedItemsQuery = async (
    client: PoolClient,
    items: CreateMatchResult[]
): Promise<MatchResult[]> => {

    if (items.length === 0) {
        return [];
    }

    const values: any[] = [];
    const placeholders: string[] = [];

    items.forEach((item, index) => {
        const baseIndex = index * 6;

        placeholders.push(
            `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`
        );

        values.push(
            item.session_uuid,
            item.session_run_id,
            item.item_id,
            item.result_type,
            item.score,
            item.rank
        );
    });

    const query = `
        INSERT INTO matching_match_result
            (session_uuid, session_run_id, item_id, result_type, score, rank)
        VALUES
            ${placeholders.join(", ")}
        RETURNING id
    `;

    const result = await client.query(query, values);

    if (!result.rows || result.rows.length !== items.length) {
        console.error("Not all matched items were inserted");
        throw new Error("Not all matched items were inserted");
    }

    return result.rows.map((row, index) => ({
        id: row.id,
        ...items[index]
    })) as MatchResult[];
};


/**
 * Inserts a new matching session and returns the created session record.
 * Returns null if the insert failed.
 */
export const insertSessionQuery = async (
    client: PoolClient,
    session: CreateMatchingSession
): Promise<MatchingSession | null> => {

    const queryObj = {
        text: `
            INSERT INTO matching_session
                (creation_size, real_size, creation_time, session_state, session_type)
            VALUES
                ($1, $2, to_timestamp($3 / 1000.0), $4, $5)
            RETURNING
                id,
                uuid,
                creation_time
        `,
        values: [
            session.creation_size,
            session.real_size,
            session.creation_time, // unix ms (number)
            session.session_state,
            session.session_type
        ]
    };

    const result = await client.query(queryObj);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    return {
        id: Number(row.id),
        uuid: row.uuid,
        creation_size: session.creation_size,
        real_size: session.real_size,
        creation_time: row.creation_time, // timestamp z DB
        session_state: session.session_state,
        session_type: session.session_type
    };
};

/*export const insertSessionQuery = async (client: PoolClient, session: CreateMatchingSession) : Promise<MatchingSession|null> => {

    const queryObj = {
        text: 'INSERT INTO matching_session (creation_size, real_size, creation_time, session_state, session_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, uuid',
        values: [session.creation_size, session.real_size, session.creation_time, session.session_state, session.session_type]
    }


    const result = await client.query(queryObj);

    if (result.rows.length == 0)
        return null;

    const resRow = result.rows[0];

    return {
        id: resRow.id,
        uuid: resRow.uuid,
        ...session,
    }
}*/

/**
 * Inserts a new matching session and returns the created session record.
 * Returns null if the insert failed.
 */
export const insertSessionInitMoviesQuery = async (client: PoolClient, userUUID: string, votingResults: VotingResult[]) : Promise<void> => {

    // Handle empty input
    if (votingResults.length === 0) {
        return;
    }

    const placeholders = votingResults
        .map((_, index) => {
            const base = index * 3;
            return `($${base + 1}, $${base + 2}, $${base + 3})`;
        })
        .join(', ');

    const values = votingResults.flatMap(result => [
        userUUID,
        result.itemId,
        result.rating
    ]);

    // Construct query with ON CONFLICT
    const queryText = `
        INSERT INTO movie_ratings (user_id, movie_id, rating)
        VALUES ${placeholders}
        ON CONFLICT (user_id, movie_id)
        DO UPDATE SET rating = EXCLUDED.rating
    `;

    const queryObj = { text: queryText, values };

    // Execute query
    await client.query(queryObj);
}

/**
 * Inserts initial movie voting results for a user (batch insert).
 */
export const insertActivityInitializedQuery = async (client: PoolClient, userUUID: string, sessionType: SessionType): Promise<number> => {
    const queryObj = {
        text: `INSERT INTO initialized_session_types (user_uuid, activity_type)
                VALUES ($1, $2)
                ON CONFLICT (user_uuid, activity_type)
                DO UPDATE SET creation_time = NOW()
                RETURNING id`,
        values: [userUUID, sessionType]
    }

    const result = await client.query(queryObj);

    const row = result.rows[0];

    if (!row || typeof row.id !== "number") {
        throw new Error("Failed to insert or update activity initialization: no ID returned");
    }

    return result.rows[0].id
}

////////////////////////////////
//          GETTERS           //
////////////////////////////////

/**
 * Returns all users for a given session UUIDs.
 */
export const getSessionUsersBySessionUUIDsQuery = async (
    client: PoolClient,
    sessionUUIDs: string[]
): Promise<SessionUser[]> => {

    if (sessionUUIDs.length === 0) {
        return [];
    }

    const queryObj = {
        text: `
            SELECT
                su.*
            FROM matching_session_users su
            JOIN matching_session s ON su.session_id = s.id
            WHERE s.uuid = ANY($1)
        `,
        values: [sessionUUIDs]
    };

    const result = await client.query(queryObj);

    return result.rows.map((row: any) => ({
        id: Number(row.id),
        session_id: Number(row.session_id),
        user_uuid: row.user_uuid,
        is_connected: row.is_connected,
        is_creator: row.is_creator,
        metadata: row.metadata
    } satisfies SessionUser));
};

/**
 * Checks whether a user has an initialization record for the specified session type.
 * @returns True if the record exists, false otherwise.
 */
export const checkSessionInitializedQuery = async (client: PoolClient, userUUID: string, sessionType: SessionType): Promise<boolean> => {
    const queryObj = {
        text: "SELECT EXISTS ( SELECT 1 FROM initialized_session_types WHERE user_uuid = $1 AND activity_type = $2 );",
        values: [userUUID, sessionType]
    }

    const result = await client.query(queryObj);

    const row = result.rows[0];

    if (!row || typeof row.exists !== "boolean") {
        throw new Error("Failed to check initialization state: invalid query result");
    }

    return row.exists;
}

/**
 * Returns all sessions data for given user by his UUID, sessions that are not BROKEN, MATCHED or FINISHED.
 * // Active sessions = everything still in progress
 */
export const getUserActiveSessionsQuery = async (client: PoolClient, userUUID: string): Promise<MatchingSession[]> => {
    const queryObj = {
        text: "SELECT s.* FROM matching_session_users AS u LEFT JOIN matching_session AS s ON u.session_id = s.id WHERE u.user_uuid = $1 AND session_state <> 'BROKEN' AND session_state <> 'MATCHED' AND session_state <> 'FINISHED'",
        values: [userUUID]
    }

    const result = await client.query(queryObj);

    return result.rows.map((row: any)=>({
        id: row.id,
        uuid: row.tableID,
        creation_size: row.creation_size,
        real_size: row.real_size,
        creation_time: row.creation_time,
        session_type: row.session_type,
        session_state: row.session_state
    }))
}

/**
 * Returns sessions for a given user filtered by allowed or forbidden session states.
 * If both arrays are empty, returns all sessions for the user.
 */
export const getUserSessionsFiltered = async (
    client: PoolClient,
    userUUID: string,
    allowedStates: SessionState[] = [],
    forbiddenStates: SessionState[] = []
): Promise<MatchingSession[]> => {

    // add other restrictive conditions if needed
    const conditions: string[] = ["u.user_uuid = $1"];
    const values: any[] = [userUUID];
    let paramIndex = 2;

    if (allowedStates.length > 0) {
        conditions.push(`s.session_state = ANY($${paramIndex})`);
        values.push(allowedStates);
        paramIndex++;
    }

    if (forbiddenStates.length > 0) {
        conditions.push(`s.session_state <> ALL($${paramIndex})`);
        values.push(forbiddenStates);
        paramIndex++;
    }

    const queryObj = {
    text: `
        SELECT
        s.id, s.uuid, s.creation_size, s.real_size, s.session_type, s.session_state,
        ((EXTRACT(EPOCH FROM s.creation_time) * 1000)::bigint) AS creation_time
        FROM matching_session_users AS u
        LEFT JOIN matching_session AS s ON u.session_id = s.id
        WHERE ${conditions.join(" AND ")}
    `,
    values
    };

    const result = await client.query(queryObj);

    return result.rows.map((row: any) => ({
        id: Number(row.id),
        uuid: row.uuid,
        creation_size: row.creation_size,
        real_size: Number(row.real_size),
        creation_time: Number(row.creation_time),
        session_type: row.session_type,
        session_state: row.session_state
    } satisfies MatchingSession));
};

/**
 * Returns all sessions whose state is included in the given list of allowed states.
 */
export const getAllSessionsByStatesQuery = async (client: PoolClient, allowedStates: SessionState[]): Promise<MatchingSession[]> => {

    const queryObj = {
        text: 'SELECT s.* FROM matching_session AS s LEFT JOIN matching_session_users AS u ON u.session_id = s.id WHERE s.session_state = ANY($1)',
        values: [allowedStates]
    }

    const result = await client.query(queryObj);

    return result.rows.map((row: any)=>({
        id: row.id,
        uuid: row.tableID,
        creation_size: row.creation_size,
        real_size: row.real_size,
        creation_time: row.creation_time,
        session_type: row.session_type,
        session_state: row.session_state
    } satisfies MatchingSession))
}

/**
 * Returns a session by its UUID, or null if no session exists.
 */
export const getSessionByUUIDQuery = async (client: PoolClient, sessionUUID: string) : Promise<MatchingSession | null> => {

    const queryObj = {
        text: 'SELECT * FROM matching_session WHERE uuid = $1',
        values: [sessionUUID]
    }

    const result = await client.query(queryObj);

    if (result.rows.length > 0) {
        const sess = result.rows[0]

        return {
            id: sess.id,
            uuid: sess.uuid,
            creation_size: sess.creation_size,
            real_size: sess.real_size,
            creation_time: sess.creation_time,
            session_type: sess.session_type,
            session_state: sess.session_state
        } satisfies MatchingSession;
    }

    return null;
}

////////////////////////////////
//          UPDATES           //
////////////////////////////////

/**
 * Updates the state of a session identified by its internal ID.
 */
export const updateSessionStateQuery = async (client: PoolClient, sessionId: number, state: SessionState) : Promise<void> =>
{
    const queryObj = {
        text: 'UPDATE matching_session SET session_state = $1 WHERE id = $2',
        values: [state, sessionId]
    };

    await client.query(queryObj);
}

/**
 * Updates the given sessions and returns number of affected rows.
 */
export const updateSessionsStatesQuery = async (client: PoolClient, newState: SessionState, sessionIds: number[]): Promise<number> => {

    const queryObj = {
        text: 'UPDATE matching_session SET session_state = $1 WHERE id = ANY($2)',
        values: [newState, sessionIds]
    }

    const result = await client.query(queryObj);

    return result.rowCount ?? 0;
}

/**
 * Updates connection state for multiple user-session records and returns number of affected rows.
 */
export const updateUserSessionConnectionStateQuery = async (client: PoolClient, connectionState: boolean, recordIds: number[]): Promise<number> => {

    const queryObj = {
        text: 'UPDATE matching_session_users SET is_connected = $1 WHERE id = ANY($2)',
        values: [connectionState, recordIds]
    }

    const result = await client.query(queryObj);

    return result.rowCount ?? 0;
}

/**
 * Updates metadata for a user-session record and returns number of affected rows.
 */
export const updateUserSessionMetadataQuery = async (client: PoolClient, metadata: string, recordId: number): Promise<number> => {

    const queryObj = {
        text: 'UPDATE matching_session_users SET metadata = $1 WHERE id = $2',
        values: [metadata, recordId]
    }

    const result = await client.query(queryObj);

    return result.rowCount ?? 0;
}


////////////////////////////////
//          DELETES           //
////////////////////////////////

/**
 * Deletes all user-session relations for the given session with given session UUID and returns number of removed rows.
 */
export const deleteSessionQuery = async (client: PoolClient, sessionUUID: string): Promise<number> => {
    const queryObj = {
        text: 'DELETE FROM matching_session WHERE sessionUUID = $1',
        values: [sessionUUID]
    }

    const result = await client.query(queryObj);

    return result.rowCount ?? 0
}

/**
 * Removes a specific user from a session and returns number of removed rows.
 */
export const deleteUsersFromSessionQuery = async (client: PoolClient, sessionId: number): Promise<number> => {

    const queryObj = {
        text: 'DELETE FROM matching_session_users WHERE session_id = $1',
        values: [sessionId]
    }

    const result = await client.query(queryObj);

    return result.rowCount ?? 0
}

/**
 * Removes a specific user from a session and returns number of removed rows.
 */
export const deleteUserFromSessionQuery = async (client: PoolClient, sessionId: number, userId: number): Promise<number> => {

    const queryObj = {
        text: 'DELETE FROM matching_session_users WHERE session_id = $1 AND userId = $2',
        values: [sessionId, userId]
    }

    const result = await client.query(queryObj);

    return result.rowCount ?? 0
}




