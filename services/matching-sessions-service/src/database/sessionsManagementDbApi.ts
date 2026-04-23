import {
    getAllSessionsByState,
    insertNewSession,
    markSessionsAsBroken,
    updateSessionsStateByIds,
    updateUsersConnectionState,
    updateUserMetadata
} from "./sessionsManagementDatabase";
import {
    CreateMatchingSession,
    CreateSessionUser,
    MatchingSession,
    MatchingSessionWithUsers
} from "./pg/types/session.db.types";
import { SessionState } from "../interface";

/**
 * Database-facing contract used by class-based services.
 *
 * Why this exists:
 * - keeps `SessionsCachingService` decoupled from direct functional DB calls,
 * - preserves a clean OOP boundary (service -> DB API interface -> DB implementation),
 * - makes replacement/mocking of DB access easier in tests and future refactors.
 */
export interface SessionsManagementDbApi {
    getAllSessionsByState(allowedStates: SessionState[]): Promise<MatchingSession[]>;
    markSessionsAsBroken(sessionIds: number[]): Promise<void>;
    updateUsersConnectionState(connectionState: boolean, userRecordIds: number[]): Promise<void>;
    updateUserMetadata(userMetadata: string, userRecordId: number): Promise<boolean>;
    updateSessionsStateByIds(sessionIds: number[], newState: SessionState): Promise<boolean>;
    insertNewSession(
        sessionData: CreateMatchingSession,
        sessionUsers: CreateSessionUser[]
    ): Promise<MatchingSessionWithUsers | null>;
}

/** Default adapter over the current functional DB layer. */
export const sessionsManagementDbApi: SessionsManagementDbApi = {
    getAllSessionsByState,
    markSessionsAsBroken,
    updateUsersConnectionState,
    updateUserMetadata,
    updateSessionsStateByIds,
    insertNewSession
};
