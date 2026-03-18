import { PoolClient } from 'pg';
import * as db from './pg/dbConnection';
import { ChatMessage, CreateChatMessage, deleteMessageQuery, deleteMessagesBySessionUUIDQuery, getMessagesBySessionQuery, insertChatMessageQuery } from './pg/elementaryQueries/sessionChatQueries';

////////////////////////////////
//          GETTERS           //
////////////////////////////////


/**
 * Loads all the messages from given session after the timestamp
 * @param sessionUUID The UUID of the session to replay messages from
 * @param userUUID The UUID of the user that requested the messages
 * @param afterTimestamp Unix timestamp marking the last received messages by user (we return all the newer messages)
 */
export const getMessagesBySession = async (
    sessionUUID: string,
    afterTimestamp: Date
): Promise<ChatMessage[]> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        return await getMessagesBySessionQuery(client, sessionUUID, afterTimestamp);
    });
};


////////////////////////////////
//         INSERTIONS         //
////////////////////////////////

/**
 * Stores new message into database.
 * @returns Newly inserted ChatMessage record.
 */
export const storeChatMessage = async (
    msg: CreateChatMessage
): Promise<ChatMessage> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        return await insertChatMessageQuery(client, msg);
    });
};


////////////////////////////////
//          UPDATES           //
////////////////////////////////


///////////////////////////////////
//           DELETIONS           //
///////////////////////////////////

export const deleteMessage = async (
    id: number
): Promise<number | null> => {

    return db.ExecuteTransaction(async (client: PoolClient) => {
        return await deleteMessageQuery(client, id);
    });
};


export const deleteMessagesBySessionUUID = async (
    session_uuid: string
): Promise<number[]> => {

    return db.ExecuteTransaction(async (client: PoolClient) => {
        return await deleteMessagesBySessionUUIDQuery(client, session_uuid);
    });
};