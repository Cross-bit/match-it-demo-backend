
import { PoolClient } from 'pg';
import * as db from './pg/dbConnection';

import * as SessionQueries from './pg/elementaryQueries';
import { getAllUsersUUIDsInSessionQuery } from './pg/elementaryQueries/sessionUsersQueries';
import { CreateMatchingSession, CreateMatchResult, CreateSessionUser, MatchResult } from "./pg/types/session.db.types";
import { MatchingSessionWithUsers } from "./pg/types/session.db.types";
import { MatchingSession, SessionUser } from "./pg/types/session.db.types";
import { SessionState, SessionType } from '../interface';
import { VotingResult } from '../services/types';
import logger from '../logger';


////////////////////////////////
//          GETTERS           //
////////////////////////////////

/** Returns all sessions with one of the allowed states (no user filter). */
export const getAllSessionsByState = async (allowedStates: SessionState[]) : Promise<MatchingSession[]> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        return await SessionQueries.getAllSessionsByStatesQuery(client, allowedStates);
    });
}

/** Returns all sessions for a user with given userUUID that match any of the allowed states. */
export const getAllUsersSessionsWithAllowedState = async (userUUID: string, allowedStates: SessionState[]) : Promise<MatchingSession[]> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        return await SessionQueries.getUserSessionsFiltered(client, userUUID, allowedStates);
    });
}

/** Returns all sessions for a user with given userUUID excluding the given forbidden states. */
export const getAllUsersSessionsExcludingStates = async (userUUID: string, forbiddenStates: SessionState[]) : Promise<MatchingSession[]> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        return await SessionQueries.getUserSessionsFiltered(client, userUUID, [], forbiddenStates);
    });
}

/** Returns all sessions for a user with given userUUID that match any of the allowed states. */
export const getAllUsersHistorySessionsWithAllowedState = async (userUUID: string, allowedStates: SessionState[]) : Promise<MatchingSessionWithUsers[]> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        const sessions = await SessionQueries.getUserSessionsFiltered(client, userUUID, allowedStates);
        if (sessions.length === 0) return [];

        const sessionUUIDs = sessions.map(s => s.uuid);
        const users = await SessionQueries.getSessionUsersBySessionUUIDsQuery(client, sessionUUIDs);
        const usersBySessionId = new Map<number, SessionUser[]>();

        for (const user of users) {
            const rec = usersBySessionId.get(user.session_id) ?? []
            rec.push(user)
            usersBySessionId.set(user.session_id, rec);
        }

        logger.info("closer to db returned result with sessions 45", { l: usersBySessionId.get(749) })

        return sessions.map(session => ({
            ...session,
            users: usersBySessionId.get(session.id) ?? []
        })) as MatchingSessionWithUsers[];

    });
}

/** Returns active sessions for a user (legacy call wrapping the old query). */
export const getUsersSessionByUUID = async (userUUID: string) : Promise<MatchingSession[]> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        const session = await SessionQueries.getUserActiveSessionsQuery(client, userUUID);
        return session;
    });
}

/** Returns a session by its UUID or null if not found. */
export const getSessionByUUID = async (sessionUUID: string) : Promise<MatchingSession | null> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        const session = await SessionQueries.getSessionByUUIDQuery(client, sessionUUID);
        return session;
    });
}
/** Returns UUIDs of all users participating in the given session. */
export const getAllUsersUUIDSInSession = async (sessionUUID: string) : Promise<string[]> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        const result = await getAllUsersUUIDsInSessionQuery(client, sessionUUID);
        return result;
    });
}

/** Checks whether the user with given userUUID has any session history for the given session type. */
export const checkUserHasSessionHistoryData = async (userUUID: string, sessionType: SessionType) : Promise<boolean> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        return await SessionQueries.checkSessionInitializedQuery(client, userUUID, sessionType);
    });
}


////////////////////////////////
//         INSERTIONS         //
////////////////////////////////

/** Creates a new session along with its users and returns the full session data. */
export const insertNewSession = async (sessionData: CreateMatchingSession, sessionUsers: CreateSessionUser[]) : Promise<MatchingSessionWithUsers|null>=> {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        const session = await SessionQueries.insertSessionQuery(client, sessionData);

        if (!session)
            return null;

        const removalPromises = sessionUsers.map(user => {
            user.session_id = session.id;
            return SessionQueries.insertUserToSessionQuery(client, user);
        });

        const usersData = await Promise.all(removalPromises)

        return {
            ...session,
            users: usersData
        };

    });
}

/** Stores matched items into the database. */
export const storeMatchedItems = async (matchResults: CreateMatchResult[]) : Promise<MatchResult[]> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        return await SessionQueries.insertMatchedItemsQuery(client, matchResults);
    });
}

/** Adds a user to an existing session and returns the created session-user record. */
export const addUserToSession = async (userData: CreateSessionUser): Promise<SessionUser> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        const session = await SessionQueries.insertUserToSessionQuery(client, userData);
        return session;
    });
}

/** Stores initial movie voting results for the given user. */
export const insertUserMovieInitVotingResults = async (userUUID: string, results: VotingResult[]) : Promise<void> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        await SessionQueries.insertSessionInitMoviesQuery(client, userUUID, results);
        await SessionQueries.insertActivityInitializedQuery(client, userUUID, SessionType.MOVIE)
    });
}


////////////////////////////////
//          UPDATES           //
////////////////////////////////

/**
 * Updates the state of multiple sessions identified by their internal IDs.
 *
 * @param sessionIds Internal database session ids.
 * @param newState New state to update session state to.
 * @returns Returns true if lines were affected, false if no line was affected.
 */
export const updateSessionsStateByIds = async (sessionIds: number[], newState: SessionState) : Promise<boolean> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        return await SessionQueries.updateSessionsStatesQuery(client, newState, sessionIds) > 0;
    });
}

/** Marks specific sessions as BROKEN (sets it's state to be BROKEN). Requires internal database sessionIds. */
export const markSessionsAsBroken = async (sessionIds: number[]) : Promise<void> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {

        // set state to broken
        await SessionQueries.updateSessionsStatesQuery(client, SessionState.BROKEN, sessionIds);

    });
}

/** Updates the connection status for the given user-session records.
 *
 * @returns True if the metadata was updated, false if no record matched.
*/
export const updateUsersConnectionState = async (connectionState: boolean, userRecordIds: number[]) : Promise<void> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        await SessionQueries.updateUserSessionConnectionStateQuery(client, connectionState, userRecordIds);
    });
}


/**
 * Updates metadata for a specific user-session record.
 * @returns True if the record was updated, false otherwise.
*/
export const updateUserMetadata = async (userMetadata: string, userRecordId: number) : Promise<boolean> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        return await SessionQueries.updateUserSessionMetadataQuery(client, userMetadata, userRecordId) > 0;
    });
}

///////////////////////////////////
//           DELETIONS           //
///////////////////////////////////

/**
 * Removes a specific user from a session by their internal IDs.
 * @returns True if a row was removed, false otherwise.
 */
export const removeUserFromSessionById = async (sessionId: number, userId: number) : Promise<boolean> => {
    return db.ExecuteTransaction(async (client: PoolClient) => {
        return await SessionQueries.deleteUserFromSessionQuery(client, sessionId, userId) > 0;
    });
}