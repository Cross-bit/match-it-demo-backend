import { SessionType, SessionState } from "../../interface"
import { getAllSessionsByState, insertNewSession, markSessionsAsBroken, updateSessionsStateByIds, updateUsersConnectionState, updateUserMetadata } from "../../database/sessionsManagementDatabase"
import { MatchingSessionWithUsers } from "../../database/pg/types/session.db.types";
import { MatchingSession, SessionUser } from "../../database/pg/types/session.db.types";
import { getUsersFcmsByUserUUIDs } from "../../database/usersDatabase";
import logger from "../../logger";
import { SessionMetadata } from "../types";
import { SessionNotFoundError } from "../../errors/SessionNotFoundError";
import { DomainError, SessionMemberErrorCode } from "../../errors/DomainError";


/** =========================================
 *  DESCRIPTION
 *  ==========================================
 * Provides centralized entity to track existing sessions with their basic metadata.
 * SessionsCachingService - high level structure for management of all currently s (their basic metadata).
 * Optimized for efficiency, works on
 *
 */


type sessionUUID = string;

/**
 * Hold information about each member of the
 */
export interface MemberData
{
    /**
     * Internal ID of the member within the session-members table.
     * (NOTE: This is not the user's internal ID from the users table.)
     */
    id: number,

    /**
     * The user's global UUID from the users table.
     */
    uuid: string,

    /**
     * The member's FCM token used for push notifications.
     */
    fcm: string,

    /**
     * Indicates whether this member is the creator of the session
     * (i.e., the one who initiated the session and sent invites).
     */
    isCreator: boolean

    /**
     * True if the member has accepted the invitation and is currently connected.
     * False if the invitation was rejected or the user disconnected during the session.
     */
    isConnected: boolean

    /**
     * Optional metadata containing contextual information needed by clients during the session.
     */
    metadata?: SessionMetadata
}

export interface SessionData
{
    id: number,
    uuid: string,
    creationSize: number,
    currentRealSize: number,
    groupUUID?: string,
    creationTime: Date,
    sessionType: SessionType,
    sessionState: SessionState,
    members: MemberData[]
}


/**
 * Metadata caching data structure
 */
class SessionsCachingService
{

    private sessions: Map<sessionUUID, SessionData>

    constructor() {
        this.sessions = new Map<sessionUUID, SessionData>();
    }

    getSessionData = (uuid: string): Readonly<SessionData> | null => {
        const session = this.sessions.get(uuid);
        return session ? Object.freeze({ ...session }) : null;
    }

    /**
     * Resets the state of all the sessions structures in the database (all the unfinished and unmatched sessions will be marked as broken). Expected to be called on the service start.
     */
    reloadAllSessions = async () => {

        // We select all sessions in unfinished/unmatched state (clearly the server e.g.fell before or during the matching itself)
        const allowedStates = [ SessionState.CREATED, SessionState.INVITING, SessionState.RUNNING ];

        const sessions: MatchingSession[]
        = await getAllSessionsByState(allowedStates);

        if (sessions.length > 0)
            markSessionsAsBroken(sessions.map(s => s.id)) // TODO: is this safe without await??
    }

    /**
     * Attempts to obtain session data for a given user by their UUID.
     * // (NOTE This operation performs a linear scan across all active sessions and their members and therefore can be quite expensive.)
     */
    getSessionDataByConnectedUserUUID = (userUUID: string) : SessionData|null => {

        logger.info("[SESSION MANAGER]: checking user is connected to a session \n", { userUUID })

        // NOTE: this should be rewritten more efficiently
        let sessionRes = null;
        for (let [sessionUUID, session] of this.sessions) {
            if (session.members.find(u => (u.uuid == userUUID) && (u.isConnected == true)) != undefined)  // it is important to check both.
            {
                sessionRes = {...session}
                break;
            }
        };

        if (sessionRes)
            logger.info(`User ${userUUID} is connected to a session `, sessionRes)

        return sessionRes;
    }

    isUserConnectedInSession = (userUUID: string) : boolean => {
        const res = (this.getSessionDataByConnectedUserUUID(userUUID)) != null
        logger.info(res);
        return res;
    }

    updateUserSessionMetadata = async (sessionUUID: string, userUUID: string,  userMetadata?: SessionMetadata) : Promise<boolean> =>
    {
        const sessionData = this.sessions.get(sessionUUID);

        if (!sessionData) {
            logger.error("FATAL: Trying to update user metadata failed, session not exist!");
            throw new SessionNotFoundError("FATAL: Trying to update user metadata failed, session not exist!")
        }

        for (const member of sessionData.members) {
            if (member.uuid == userUUID) {

                member.metadata = userMetadata

                await updateUserMetadata(JSON.stringify(userMetadata), member.id);

                return Promise.resolve(true);
            }
        }

        logger.error(`FATAL: Trying to update metadata of unknown user, userUUID ${userUUID}, sessionUUID: ${sessionUUID}.`);
        return Promise.resolve(false);
    }

    /**
     * Assigns group UUID to the given record session.
     */
    updateGroupUUIDMetadata = (sessionUUID: string, groupUUID: string) => {
        const sessionData = this.sessions.get(sessionUUID);

        if (!sessionData) {
            logger.error("FATAL: Trying to update user metadata failed, session not exist!");
            throw new SessionNotFoundError("FATAL: Trying to update user metadata failed, session not exist!")
        }

        sessionData.groupUUID = groupUUID
    }

    /** Connects new member to the database
     *
     * @param sessionUUID
     * @param userUUID
     * @returns
     */
    tryConnectMemberToSession = async (sessionUUID: string, userUUID: string) : Promise<boolean> => {
        const sessionData = this.sessions.get(sessionUUID);

        logger.info(`[SESSION MANAGER]: connecting member to session, userUUID ${userUUID}.`)

        if (!sessionData) {
            logger.error("Trying to connect to not existing session!");
            throw new SessionNotFoundError("Trying to connect to not existing session!")
        }

        if (sessionData?.sessionState != SessionState.CREATED) {
            logger.warn("Attempt to connect member to running session!");
            return false;
        }

        for (const member of sessionData.members) { // we expect all users to be as invited
            if (member.uuid == userUUID) {
                member.isConnected = true;
                sessionData.currentRealSize++;

                await updateUsersConnectionState(true, [member.id]);
                return true;
            }
        }

        logger.error(`Attempt to connect unknown user to session (User wasn't invited), userUUID ${userUUID}.`);
        return false;
    }


    /** Disconnects member from the session.
     *
     * @param sessionUUID
     * @param userUUID
     * @returns
     */
    tryDisconnectMemberFromSession = async (sessionUUID: string, userUUID: string) : Promise<boolean> => {

        logger.info(`[SESSION MANAGER]: DISCONNECTING ${userUUID} from session ${sessionUUID}`)
        const sessionData = this.sessions.get(sessionUUID);

        if (!sessionData) {
            logger.error("FATAL: Trying to connect to not existing session!");
            throw new SessionNotFoundError(`FATAL: Trying to connect to not existing session!`, sessionUUID)
        }

        for (const member of sessionData.members) { // we expect all users to be as invited
            logger.info(member);
            if (member.uuid == userUUID) {
                member.isConnected = false;
                sessionData.currentRealSize--;

                await updateUsersConnectionState(false, [member.id]);
                return true;
            }
        }

        return false
    }

    /** Starts created session.
     *
     * @param userUUID UUID of the user that created the sesssion.
     * @param sessionUUID UUID of the session to start.
     * @returns void
     */
    public startSession = async (userUUID: string, sessionUUID: string) => {

        logger.info(`[SESSION MANAGER]: STARTING SESSION ${sessionUUID} created by ${userUUID}`)
        const sessionToStart = this.sessions.get(sessionUUID);

        if (!sessionToStart) {
            logger.error("FATAL: Attempt to start non existing session.");
            throw new SessionNotFoundError("FATAL: Attempt to start non existing session.")
        }

        const sessionCreator = await this.getSessionCreator(sessionUUID);

        if (sessionCreator.uuid != userUUID) {
            logger.error("FATAL: Unauthorized session start, only creator can start the session.");
            throw new SessionNotFoundError("Unauthorized session start, only creator can start the session.")
        }

        await updateSessionsStateByIds([sessionToStart.id], SessionState.RUNNING);
        sessionToStart.sessionState = SessionState.RUNNING;

        logger.info(`Session ${sessionUUID} is running:`);
        logger.info(sessionToStart);
    }

    /** Ends given session hard, session is deleted from the cache and marked as BROKEN.
     *
     * @param sessionUUID UUID of the session to match.
     */
    public terminateSession = async (sessionUUID: string) => {
        logger.info(`[SESSION MANAGER]: TERMINATING SESSION ${sessionUUID}`)

        const sessionToTerminate = this.sessions.get(sessionUUID);

        if (!sessionToTerminate) {
            logger.warn(`Session termination failed: Session ${sessionUUID} is not in the cache!`);
            throw new SessionNotFoundError(sessionUUID);
        }

        this.sessions.delete(sessionUUID);

        const sessionId = sessionToTerminate?.id as number;

        await markSessionsAsBroken([ sessionId ]);

        return sessionToTerminate;
    }

    /** Supposed to be called once the matching session ended with match.
     *
     * @param sessionUUID UUID of the session to match.
     */
    public endSessionWithMatch = async (sessionUUID: string) => {

        const sessionToTerminate = this.sessions.get(sessionUUID);

        if (!sessionToTerminate) {
            logger.error(`Session end failed: Session ${sessionUUID} is not in the cache!`);
            throw new SessionNotFoundError(`Session end failed: Session ${sessionUUID} is not in the cache!`)
        }

        this.sessions.delete(sessionUUID);

        const sessionId = sessionToTerminate?.id as number;
        // we update the state in db here since we removed it from the cache
        await updateSessionsStateByIds([ sessionId ], SessionState.MATCHED);
    }

    /** Supposed to be called once users are happy with the result and the session can be completely disposed and deleted.
     *
     * @param sessionUUID UUID of the session to match.
     */
    public finishMatchingSession = async (sessionUUID: string) => {

        const sessionToFinish = this.sessions.get(sessionUUID);

        if (!sessionToFinish) {
            logger.error(`Session end failed: Session ${sessionUUID} is not in the cache`);
            throw new SessionNotFoundError(`Session end failed: Session ${sessionUUID} is not in the cache`)
        }

        this.sessions.delete(sessionUUID);

        const sessionId = sessionToFinish?.id as number;
        // we update the state in db here since we removed it from the cache
        await updateSessionsStateByIds([ sessionId ], SessionState.MATCHED);
    }

    /**
     * Creates new session.
     *
     * @param initSize number of invited members
     * @param sessionType type of the session
     * @param creatorUUID session creators UUID
     * @param invitedMembersUUIDs all members UUIDs
     * @returns
     */
    addNewSession = async (initSize: number, sessionType: SessionType, creatorUUID: string, invitedMembersUUIDs: string[]): Promise<SessionData> => {

        logger.info("CACHING SESSION");
        const newSession: Omit<SessionData, "id"|"uuid"> = {
            creationSize: initSize,
            currentRealSize: 1, // realSize is one for the creator that is connected implicitly
            creationTime: new Date(),
            sessionType: sessionType,
            sessionState: SessionState.CREATED,
            members: []
        };

        newSession.members.push({
            id: -1,
            uuid: creatorUUID,
            isCreator: true,
            isConnected: true,
            fcm: "",
            metadata: undefined
        });

        //we prevent duplicates here... it should not happen ... but...
        [...new Set(invitedMembersUUIDs)].forEach(
        (memberUUID) =>
            newSession.members.push({
                id: -1,
                uuid: memberUUID,
                isCreator: false,
                isConnected: false,
                fcm: "",
                metadata: undefined,
        }))

        const result = await this.insertNewSessionToDatabase(newSession)

        if (!result) {
            const err = new Error("insertNewSessionToDatabase returned null");
            logger.error(err.message, { newSession });
            throw err;
        }

        logger.info(`Session ${ result?.uuid } of type ${ result?.session_type } inserted into database.`);

        let membersWithFcm = null;
        try {
            membersWithFcm = await this.addFcmTokensToMemberData(result.users)
        }
        catch(e) {
            await markSessionsAsBroken([ result.id ]);
            logger.error('An error occurred while populating member data with FCM', { e });
        }

        // finally set it to the local caching structure
        const sessionData = {
            id: result.id,
            uuid: result.uuid,
            creationSize: membersWithFcm?.length,
            currentRealSize: membersWithFcm?.filter(u => u.isConnected).length, // but should be generally 1 at the beginning for the creator...
            creationTime: newSession.creationTime,
            sessionType: result.session_type,
            sessionState: result.session_state,
            members: membersWithFcm
        } as SessionData

        this.sessions.set(result.uuid, sessionData);

        logger.info(`Session data succesfully cached:`);
        logger.info(sessionData);

        return Promise.resolve(sessionData);
    }

    public checkSessionIsEmpty = async (sessionUUID: string): Promise<boolean> => {
        let session = this.sessions.get(sessionUUID);

        if (!session) {
            logger.error(`Session ${sessionUUID} not found in cache`);
            throw new SessionNotFoundError(sessionUUID);
        }

        const realSize = session?.currentRealSize ?? 1;

        logger.error(`Checking session is empty, sessionUUID ${sessionUUID}; size: ${realSize}`);

        // at least two members must be connected
        return realSize <= 1;
    }

    /**
     * Adds users FCM (firebase cloud messaging) tokens to session member metadata.
     */
    private addFcmTokensToMemberData = async (userDbRecord: SessionUser[]): Promise<MemberData[]> =>
    {
        try {
            const membersUUIDs = userDbRecord.map((member => member.user_uuid))

            // we get all the users FCMs
            const recipientsFCM = (await getUsersFcmsByUserUUIDs(membersUUIDs))

            const recipientsFCM_UUIDS = new Set(recipientsFCM.map(m => m.user_uuid));

            const recipientsWithoutUUIDS =  membersUUIDs.filter(uuid => !recipientsFCM_UUIDS.has(uuid));


            // we have map from userFcm, because it may happen that not every user in the list have fcm!!! (it should be prohibited somewhere else... but...)
            const result = recipientsFCM.map(userFcm => {
                const user = userDbRecord.find(user => user.user_uuid == userFcm.user_uuid) as SessionUser

                return {
                    id: user.id,
                    uuid: user.user_uuid,
                    isCreator: user.is_creator,
                    isConnected: user.is_connected,
                    fcm: userFcm.fcm_token
                } as MemberData
            })

            // we check if after construction, since we still can in some cases start the session

            // some recipients does not have FCM!!
            if (recipientsWithoutUUIDS.length > 0) {
                logger.error("[GETTING USERS FCMs] some users don't have FCM!! and they can't participate in matching", { usersWithoutFcm: recipientsWithoutUUIDS })
                    throw new DomainError(
                        SessionMemberErrorCode.MEMBER_MISSING_FCM,
                        "Some session members don't have FCM tokens",
                        { usersWithoutFcm: recipientsWithoutUUIDS }
                    );
            }

            return Promise.resolve(result)
        }
        catch(e) {
            logger.error("Error while populating member data with FCM", { e });

                if (e instanceof DomainError) {
                    throw e;
                }

                throw new DomainError(
                    SessionMemberErrorCode.FCM_FETCH_FAILED,
                    "Failed to fetch FCM tokens for session members",
                    e
                );
        }
    }

    /**
     * Writes the session record into the database.
     */
    private insertNewSessionToDatabase = async (newSession: Omit<SessionData, "id"|"uuid">) : Promise<MatchingSessionWithUsers|null> => {
        let meberDb;
        try {
            meberDb = newSession.members.map((data) => ({
                session_id: -1, // we don't know the session id here... so we put here placeholder and InsertNewSession will handle it ...
                user_uuid: data.uuid,
                is_connected: data.isConnected,
                is_creator: data.isCreator,
                metadata: JSON.stringify(data.metadata)
            }))
        }
        catch(e) {
            logger.error(`Error while serializing user data for new session ${newSession.sessionType} creation!`)
            return null
        }


        return await insertNewSession({
            creation_size: newSession.creationSize,
            real_size: newSession.currentRealSize,
            creation_time: newSession.creationTime.getTime(),
            session_type: newSession.sessionType,
            session_state: newSession.sessionState
        }, meberDb);
    }

    /**
     * Returns creator of the given session.
     */
    private getSessionCreator = async (sessionUUID: string): Promise<MemberData> => {
        const session = this.sessions.get(sessionUUID);

        if (!session) {
            logger.error(`Creator search failed: Session ${sessionUUID} is not in the cache!`);
            throw new SessionNotFoundError(`Creator search failed: Session ${sessionUUID} is not in the cache!`, sessionUUID)
        }

        const creator = session?.members.find((member) => member.isCreator == true);

        if (!creator) {
            logger.error(`Creator search failed: Session ${sessionUUID} does not have creator!`);
            throw new SessionNotFoundError(`Creator search failed: Session ${sessionUUID} does not have creator!`, sessionUUID)
        }

        return creator as MemberData;
    }
}


export const sessionsCache: SessionsCachingService = new SessionsCachingService();

/**
 * When service starts, we reload all the "stuck" sessions data and reset their state.
 */
sessionsCache.reloadAllSessions();