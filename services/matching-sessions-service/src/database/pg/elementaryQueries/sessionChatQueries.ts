import { PoolClient } from "pg"


////////////////////////////////
//          GETTERS           //
////////////////////////////////

export const getMessagesBySessionQuery = async (
    client: PoolClient,
    sessionUUID: string,
    afterTimestamp: Date
): Promise<ChatMessage[]> => {

    const queryObj = {
        text: `
            SELECT id, session_uuid, user_uuid, payload, created_at
            FROM chat_message
            WHERE session_uuid = $1 AND created_at > $2::timestamptz
            ORDER BY created_at ASC
        `,
        values: [sessionUUID, afterTimestamp.toISOString()]
    };

    const result = await client.query(queryObj);

    return result.rows as ChatMessage[];
};

////////////////////////////////
//         INSERTIONS         //
////////////////////////////////

/**
 * Interface to for creating a new chat message.
 * Contains all client-provided message fields.
 */
export interface CreateChatMessage {
    message_uuid: string;
    session_uuid: string;
    user_uuid: string;
    payload: any;
}

/**
 * Fully stored chat message record returned from the database.
 */
export interface ChatMessage extends CreateChatMessage {
    id: number;
    created_at: string;
}

/**
 * Inserts a new chat message and returns the created ChatMessage record.
 */
export const insertChatMessageQuery = async (
    client: PoolClient,
    msg: CreateChatMessage
): Promise<ChatMessage> => {

    const queryObj = {
        text: `
            INSERT INTO chat_message (message_uuid, session_uuid, user_uuid, payload)
            VALUES ($1, $2, $3, $4)
            RETURNING id, created_at
        `,
        values: [msg.message_uuid, msg.session_uuid, msg.user_uuid, msg.payload]
    };

    const result = await client.query(queryObj);

    if (!result.rows || result.rows.length === 0) {
        console.error("Chat message couldn't be inserted. 0 rows inserted");
        throw new Error("Chat message couldn't be inserted. 0 rows inserted");
    }

    const row = result.rows[0];

    return {
        id: row.id,
        created_at: row.created_at,
        ...msg
    } as ChatMessage;
};


///////////////////////////////////
//           DELETIONS           //
///////////////////////////////////

/**
 * Deletes specific message with give internal id and returns it.
 */
export const deleteMessageQuery = async (
    client: PoolClient,
    id: number
): Promise<number | null> => {

    const queryObj = {
        text: `
            DELETE FROM chat_message
            WHERE id = $1
            RETURNING id
        `,
        values: [id]
    };

    const result = await client.query(queryObj);

    if (!result.rows || result.rows.length === 0) {
        return null; // nic se nesmazalo
    }

    return result.rows[0].id as number;
};

/**
 * Deletes all chat messages belonging to the given session UUID
 * and returns a list of IDs of the deleted messages.
 */
export const deleteMessagesBySessionUUIDQuery = async (
    client: PoolClient,
    session_uuid: string
): Promise<number[]> => {

    const queryObj = {
        text: `
            DELETE FROM chat_message
            WHERE session_uuid = $1
            RETURNING id
        `,
        values: [session_uuid]
    };

    const result = await client.query(queryObj);

    if (!result.rows || result.rows.length === 0) {
        return [];
    }

    return result.rows.map(row => row.id as number);
};