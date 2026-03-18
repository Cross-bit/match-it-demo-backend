import { UserDeckVotingResults, gateway, gateway as recommendationsGateway } from "../RecommendationServices/RecommendationSystemGateway"
import { CreateMatchResult, MatchResultType } from "../../database/pg/types/session.db.types";
import { checkUserHasSessionHistoryData, getUsersSessionByUUID, markSessionsAsBroken, insertUserMovieInitVotingResults, getSessionByUUID, getAllUsersHistorySessionsWithAllowedState, storeMatchedItems } from "../../database/sessionsManagementDatabase"
import { sessionsCache, SessionData, MemberData } from "./SessionsCachingService"
import { MatchedItemDTO, MatchingResultWSDTO, SessionTerminatedWSDTO, SessionTerminationReason } from "../../api/ws/manager/ws.dto"
import { MatchingResult, sessionContentService } from "./sessionCoordinator"
import { SessionState, SessionType } from "../../interface"
import { CreateSessionParams, VotingResult } from "../types"
import { sendFCMDataMessage } from "../FCM/sessionInviteNotifications"
import { DataFCM, InviteMemberToSessionFCM, MemberConnectionResultFCM, SessionStartedFCM, SessInfoMember, SessionTerminatedFCM, connectionResult, dataFCMType } from "../FCM/interface"
import { createNewGroup, getUserDataByUserUUID as getUserDataByUserUUID, tryGetGroupByUserUUIDs } from "../../database/usersDatabase"
import { UserData } from "../../database/pg/types/user.db.types"
import { webSocketManager } from "../../api/ws/manager/wsManager"
import { wsDataType, DataWs } from "../../api/ws/manager/ws.dto"
import { randomUUID } from "crypto";

import { env } from "../../config/env"

import { SessionNotFoundError } from "../../errors/SessionNotFoundError"
import { DomainError, SessionConnectionErrorCode, SessionCreationErrorCode, SessionMemberErrorCode, SessionStartErrorCode, SessionVotingErrorCode } from "../../errors/DomainError"
import { SessionUpdate as SessionUpdateParams } from "../types"
import logger from "../../logger"
import { Group } from "../groups/types"
import { SessionSummaryDTO } from "../../api/rest/v1/controllers/dtos/session.dto"
import { storeAndRouteIncomingMessage } from "../chatting/chatService";
import { ChatMessageDTO, MessageStatus } from "../../api/rest/v1/controllers/dtos/chat.dto";

/** =========================================
 *  DESCRIPTION
 *  ==========================================
 * Session management service module
 * Provides high level API for the session management (creation, termination, user connection, etc.).
 *
 */

const log = logger.child({ service: "sessionManagement" });

/**
 * Timeouts for different session states
 */
const creationTimeouts = new Map<string, NodeJS.Timeout>(); // max timeout to start the session
const maxDurationTimeouts = new Map<string, NodeJS.Timeout>(); // max timeout for session generally

/**
 * Creates new session in the system.
 * Initiates all needed resources so session can be started as soon as all members connects.
 *
 * @param creationData
 * @returns
 */
export const createNewSession = async (creationData: CreateSessionParams) : Promise<SessionData> =>
{
    log.info("[CREATING SESSION]:");
    log.info(creationData);

    const result = await getUsersSessionByUUID(creationData.creatorUUID);

    if (result.length != 0) {
        await markSessionsAsBroken(result.map(s => s.id));
        console.warn("WARN: Creator of the session already has active sessions!");
    }

    let sessionData: SessionData|null = null;
    try {
        sessionData = await sessionsCache.addNewSession(
            creationData.invitedMemberUUIDs.length,
            creationData.sessionType,
            creationData.creatorUUID,
            creationData.invitedMemberUUIDs
        );

        startCreationTimeout(sessionData.uuid, env.SESSION_CREATION_TIMEOUT_MS);
    }
    catch(e) {
        log.error("[ERROR] Session couldn't be created", e)
        throw new DomainError(
            SessionCreationErrorCode.CREATION_FAILED,
            "Session couldn't be created",
            { cause: e }
        );
    }

    return sessionData;
}


/**
 * Invites members using FCM into newly created session with given sessionUUID.
 *
 * @param sessionUUID The session UUID.
 * @returns SessionData of the given
 */
export const inviteMembersToNewSession = async (sessionUUID: string) : Promise<SessionData> =>{

    const sessionData = await sessionsCache.getSessionData(sessionUUID);

    if (!sessionData) {
        log.error("Session not found while updating group metadata", { sessionUUID });
        throw new SessionNotFoundError(sessionUUID)
    }

    const creator = sessionData?.members.find(m => m.isCreator) as MemberData
    const creatorData = await getUserDataByUserUUID(creator.uuid) as UserData

    // we rather check if the members are not connected elsewhere (it could happen these members already connected to some session in the meantime -- race condition)
    const membersThatAlreadyHaveSession = sessionData?.members.filter((member) => sessionsCache.isUserConnectedInSession(member.uuid)).filter(u => !u.isCreator).map(u => u.uuid)
    const invitableMembers = sessionData?.members.filter(member => !member.isCreator && !(member.uuid in membersThatAlreadyHaveSession))
    const invitableMembersFcm = invitableMembers.map((member) => member.fcm)

    // we invite all the members through FCM
    sendFCMDataMessage({
            type: dataFCMType.INVITE_MEMBER,
            data: {
                sessionUUID: sessionData?.uuid,
                sessionCreator: {
                    uuid: creatorData.uuid,
                    name: creatorData.name,
                    email: creatorData.email
                },
                sessionType: sessionData?.sessionType
            } as InviteMemberToSessionFCM
        } as DataFCM,
        invitableMembersFcm
    );


    if (membersThatAlreadyHaveSession.length > 0)
        log.info("Rejecting to invite users:");

    // for all members that are uninvitable ... we reject the connection implicitly since we can't invite them...
    membersThatAlreadyHaveSession.forEach((memberUUID) => {
        log.info(`user: ${memberUUID}`);
        rejectUserSessionConnection(memberUUID, sessionData?.uuid as string)
    })

    return sessionData
}

/**
 * Terminates a session, notifies members, stops recommendations, and clears data.
 *
 * @returns true if terminated, false if not found
 */
export const terminateSession = async (sessionUUID: string, reason: SessionTerminationReason = SessionTerminationReason.UNEXPECTED, message: string = "") : Promise<boolean> =>
{
    try {
        log.info(`[TERMINATING SESSION]: uuid: ${sessionUUID}`);

        let sessionData = await sessionsCache.terminateSession(sessionUUID);

        // we notify all the clients about session termination

        //const membersToSendInfoFcm = sessionData?.members.map((member) => member.fcm) as string[]
        const membersToSendInfo = sessionData?.members.map((member) => member.uuid) as string[]

        if (membersToSendInfo)
            webSocketManager.sendReliableMany({
                        sessionUUID: sessionData?.uuid,
                        reason,
                        message
                    } as SessionTerminatedWSDTO,
                wsDataType.SESSION_TERMINATED,
                membersToSendInfo
            );

        // if session was running we also end the recommendations from recommendation system
        if (sessionData?.sessionState == SessionState.RUNNING) {
            recommendationsGateway.requestEndOfRecommendation({
                session: {
                    id: sessionData?.id,
                    sessionUUID: sessionData.uuid,
                    sessionSize: sessionData.currentRealSize,
                    sessionType: sessionData.sessionType,
                    members: sessionData.members.map(m => ({userUUID: m.uuid, isCreator: m.isCreator}))
                },
                usersVotingResults: []
            })
        }

        // just make sure we also clear out the session itself
        sessionContentService.clearAllSessionData(sessionUUID);

        clearAllTimeouts(sessionUUID)
        return true;
    }
    catch (err) {

        if (err instanceof SessionNotFoundError) {
            log.warn(`Session ${sessionUUID} not found during termination.`);
            return false;
        }

        log.error("Unexpected error in terminateSession", err);
        throw err;
    }
}

/**
 * Updates the info about the members group to the session data.
 *
 * @param userUUID
 * @param sessionUUID
 */
export const updateGroupMetadata = async (sessionUUID: string, groupMetadata: Group) => {

    log.info(`[SESSION UPDATING GROUP METADATA] Session data ${sessionUUID}`);

    const sessionData = await sessionsCache.getSessionData(sessionUUID);

    if (!sessionData) {
        log.error("Session not found while updating group metadata", { sessionUUID });
        throw new DomainError(
            SessionStartErrorCode.SESSION_NOT_FOUND,
            "Session not found",
            { sessionUUID }
        );
    }

    await sessionsCache.updateGroupUUIDMetadata(sessionUUID, groupMetadata.groupUUID)
}

/**
 * Handles users rejection to connect to the session.
 *
 * @param userUUID
 * @param sessionUUID
 */
export const rejectUserSessionConnection = async (userUUID: string, sessionUUID: string) => {

    log.info(`[SESSION CONNECTION REJECT] User ${userUUID} rejected connection to session ${sessionUUID}`);

    const sessionData = await sessionsCache.getSessionData(sessionUUID);

    if (!sessionData) {
        log.error("Session not found while processing user session connection", { sessionUUID });
        throw new DomainError(
            SessionStartErrorCode.SESSION_NOT_FOUND,
            "Session not found",
            { sessionUUID }
        );
    }

    const membersToSendInfo = sessionData.members.filter(member => member.uuid != userUUID && member.isConnected).map(member => member.uuid)

    webSocketManager.sendReliableMany({
            result: connectionResult.REJECTED,
            userUUID: userUUID
        } as MemberConnectionResultFCM,
        wsDataType.INVITATION_RESULT,
        membersToSendInfo
    );
}

/**
 * Handles users accept to connect to the session.
 *
 * @param userUUID UUID of the user that is trying to connect
 * @param sessionUUID UUID of the session user is trying connect to
 * @returns
 */
export const connectUserToSession = async (userUUID: string, sessionUUID: string) : Promise<void> =>
{
    log.info(`[SESSION CONNECTION ACCEPT]`);
    log.info(`[CONNECTING USER TO SESSION] sessionUUID: ${sessionUUID}`);

    let connected: boolean;

    try {
        connected = await sessionsCache.tryConnectMemberToSession(sessionUUID, userUUID);
    } catch (e) {
        if (e instanceof SessionNotFoundError) {
            throw new DomainError(
                SessionConnectionErrorCode.SESSION_NOT_FOUND,
                "Session not found",
                { sessionUUID }
            );
        }
        throw e;
    }

    if (!connected) {
        throw new DomainError(
            SessionConnectionErrorCode.SESSION_ALREADY_RUNNING,
            "Session is already running or user is not invited",
            { userUUID, sessionUUID }
        );
    }

    log.info(`User ${userUUID} Connected to session ${sessionUUID}`, );

    const sessionData = sessionsCache.getSessionData(sessionUUID);

    // we send notification about newly created member to all other connected members
    const membersToSendInfoFcm = sessionData?.members
        .filter(member => member.uuid != userUUID && member.isConnected)
        .map(m => m.uuid) as string[]

    webSocketManager.sendReliableMany({
                result: connectionResult.CONNECTED,
                userUUID: userUUID
            } as MemberConnectionResultFCM,
        wsDataType.INVITATION_RESULT,
        membersToSendInfoFcm
    );
}

/**
 * Handles disconnection of the user form a running session.
 *
 * @param userUUID
 * @param sessionUUID
 */
export const disconnectUserFromSession = async (userUUID: string, sessionUUID: string) : Promise<void> =>
{
    log.info(`DISCONNECTING USER ${userUUID} FROM SESSION ${sessionUUID}:`);

    let disconnected: boolean;

    try {
        disconnected = await sessionsCache.tryDisconnectMemberFromSession(sessionUUID, userUUID);
    } catch (e) {
        if (e instanceof SessionNotFoundError) {
            throw new DomainError(
                SessionStartErrorCode.SESSION_NOT_FOUND,
                "Session not found",
                { sessionUUID }
            );
        }
        throw e;
    }

    if (!disconnected) {
        log.warn(`Unable to disconnect user ${userUUID} from session ${sessionUUID}`)
        throw new DomainError(
            SessionMemberErrorCode.USER_NOT_IN_SESSION,
            "User is not part of the session",
            { userUUID, sessionUUID }
        );
    }


    try {
        if (await sessionsCache.checkSessionIsEmpty(sessionUUID)){
            clearAllTimeouts(sessionUUID)
            terminateSession(sessionUUID, SessionTerminationReason.NO_MORE_USERS, "Empty session!");
        }

    } catch (e) {
        if (e instanceof SessionNotFoundError) {
            throw new DomainError(
                SessionStartErrorCode.SESSION_NOT_FOUND,
                "Session not found",
                { sessionUUID }
            );
        }
        throw e;
    }
}

export const notifyMembersAboutUserOnlineStatusChanged = async (userUUID: string, isOnline = false) : Promise<void> => {

    const sessionData = await sessionsCache.getSessionDataByConnectedUserUUID(userUUID)

    if (!sessionData) return;

    const otherConnectedUsers = sessionData.members.filter(u => u.uuid !== userUUID && u.isConnected);

    if (otherConnectedUsers.length === 0) {
        logger.info(`[SESSION NOTIFY] No other users to notify in session ${sessionData.uuid}`);
        return;
    }

    logger.info(`[SESSION NOTIFY] User ${userUUID} online status changed`, {isOnline, userUUID});

    const infoObj = {
        userUUID, // user that disconnected ...
        isOnline
    }

    webSocketManager.sendReliableMany(
        infoObj, wsDataType.ONLINE_STATUS_CHANGED, otherConnectedUsers.map(u => u.uuid));
};


/**
 * Handles session start, once session is ready. (All/minimal number of users connected, all resources were allocated)
 *
 * @param userUUID UUID of the creator of the session (only creator can start the session)
 * @param sessionUUID UUID of the session
 */
export const startSessionRecommendation = async (userUUID: string, sessionUUID: string) : Promise<void> =>
{
    log.info(`[STARTING NEW SESSION] session id: ${sessionUUID}:`);

    const sessionData = await sessionsCache.getSessionData(sessionUUID);

    if (!sessionData) {
        log.error("Trying to start unknown session!");
        throw new DomainError(SessionStartErrorCode.SESSION_NOT_FOUND, "Trying to start unknown session!", { sessionUUID, userUUID })
    }

    const connectedMembersUUIDs = sessionData.members.filter(m => m.isConnected).map(m => m.uuid)

    if (!sessionData.members.some(m => m.uuid === userUUID && m.isCreator)) {
        throw new DomainError(
            SessionStartErrorCode.USER_NOT_CREATOR,
            "Only creator can start the session",
            { userUUID, sessionUUID }
        );
    }

    await sessionsCache.startSession(userUUID, sessionUUID);

    // inform users about session start
    webSocketManager.sendReliableMany({
                sessionInfo: {
                    sessionUUID: sessionData.uuid,
                    sessionSize: sessionData.currentRealSize,
                    sessionType: sessionData.sessionType,
                    members: sessionData.members.map((member) => ({
                            uuid: member.uuid,
                            isCreator: member.isCreator
                    } as SessInfoMember))
                }
            },
            wsDataType.SESSION_STARTED,
            connectedMembersUUIDs
    );

    clearCreationTimeout(sessionUUID)
}


export const getUserSessionInfo = async (userUUID: string): Promise<SessionData|null> => {
    return await sessionsCache.getSessionDataByConnectedUserUUID(userUUID);
}

/**
 * Returns data about unfinished sessions. Those sessions that MATCHED but not finished.
 *
 * @param userUUID UUID of the user
 */
export const getUserHistorySessions = async (userUUID: string): Promise<SessionSummaryDTO[]> => {

    log.info(`[SESSION USER MATCHED SESSIONS] User ${userUUID}`);

    const sessions = await getAllUsersHistorySessionsWithAllowedState(userUUID, [SessionState.MATCHED, SessionState.FINISHED])

    return sessions.map(session => ({
            sessionUUID: session.uuid,
            sessionType: session.session_type,
            state: session.session_state,
            createdAt: session.creation_time,
            size: session.real_size,
            users: session.users.map(u => u.user_uuid),
            isCreator: session.users.some(
                u => u.user_uuid === userUUID && u.is_creator
            )
        } satisfies SessionSummaryDTO)
    );

}

export const getSessionState = async (sessionUUID: string) : Promise<SessionState> => {
    log.info(`[CHECKING SESSION STATE]: ${sessionUUID}`);

    let sessionState: SessionState | undefined;
    let session = await sessionsCache.getSessionData(sessionUUID);

    sessionState = session?.sessionState;

    if (!session) {
        const sessionDb = await getSessionByUUID(sessionUUID);
        sessionState = sessionDb?.session_state;
    }

    if (!sessionState) {
        throw new DomainError(
            SessionStartErrorCode.SESSION_NOT_FOUND,
            "Session not found",
            { sessionUUID }
        );
    }

    log.info(`[SESSION STATE]: ${sessionState}`);
    return sessionState;
}

/**
 * Handles new incoming voting results of the last deck.
 * Once user voted his deck of cards, we process and handle result of the voting here.
 *
 * @param sessionUUID
 * @param userUUID
 * @param lastMatchingData
 * @returns MatchingResult containing information if session ended with match, or we return new deck of cards.
 */
export const handleUserFinishedDeckVoting = async (
    userUUID: string,
    params: SessionUpdateParams
): Promise<void> => {

    log.info("[CHECKING SESSION MATCH STATE]", { userUUID, ...params });

    const sessionData = await sessionsCache.getSessionData(params.sessionUUID);

    if (!sessionData) {
        throw new DomainError(
            SessionVotingErrorCode.SESSION_NOT_FOUND,
            "Session not found",
            { params }
        );
        }

    try {

        await updateSessionAfterVoting(
            sessionData,
            userUUID,
            params
        );

        const matchingResult = await evaluateMatching(
            sessionData,
            userUUID,
            params.votingResult
        );

        if (matchingResult) {
            await handleMatchingResult(
                sessionData,
                matchingResult
            );
        }

    } catch (error) {
        await handleVotingFailure(error, params.sessionUUID);
    }
};

const updateSessionAfterVoting = async (
    sessionData: SessionData,
    userUUID: string,
    { votingResult, sessionMetadata }: SessionUpdateParams
) => {

    await sessionsCache.updateUserSessionMetadata(
        sessionData.uuid,
        userUUID,
        sessionMetadata
    );
};

const evaluateMatching = async (
    sessionData: SessionData,
    userUUID: string,
    votingResult: VotingResult[]
): Promise<MatchingResult<any> | null> => {
    return sessionContentService.getNextUserSessionData(
        { userUUID, votingResult },
        sessionData
    );
};

const handleMatchingResult = async (
    sessionData: SessionData,
    result: MatchingResult<any>
    ) => {

    broadcastMatchingResult(sessionData.uuid, result);

    if (result.matched) {
        await storeAndRouteIncomingMessage(
            sessionData.uuid,
            env.APP_CLIENT_UUID, {
                messageUuid: randomUUID(),
                sessionUuid: sessionData.uuid,
                userUuid: env.APP_CLIENT_UUID,
                createdAt: Date.now(),
                systemEvent: {
                    type: "MATCH_RESULT",
                    sessionRun: result.matchedItems.length > 0 ? result.matchedItems[0].run : 0,
                    sessionType: result.sessionType,
                    matchedItems: result.matchedItems.map(item => ({
                        itemId: item.itemId,
                        rank: item.rank,
                        run: item.run,
                        score: item.score,
                    } satisfies MatchedItemDTO)),
                    matchedItemUUID: result.matchedItemUUID
                },
                status: MessageStatus.SENT
            } satisfies ChatMessageDTO
        );

        await finalizeSessionWithMatch(sessionData, result);
    }
};

const broadcastMatchingResult = (
    sessionUUID: string,
    result: MatchingResult<any>
    ) => {
        for (const [userUUID, deck] of Object.entries(result.nextDeckOfCards)) {
            webSocketManager.sendReliable(
            {
                matched: result.matched,
                nextDeckOfCards: deck,
                matchedItems: result.matchedItems,
                matchedItemUUID: result.matchedItemUUID,
                sessionType: result.sessionType,
            } satisfies MatchingResultWSDTO<any>,
            wsDataType.MATCHING_RESULT,
            userUUID
            );
        }
};

const finalizeSessionWithMatch = async (
    sessionData: SessionData,
    result: MatchingResult<any>
    ) => {

    const storeData = result.matchedItems.map(d => ({
        session_uuid: sessionData.uuid,
        session_run_id: d.run,
        item_id: d.itemId,
        result_type: d.rank == 1 ? MatchResultType.WINNER : MatchResultType.CANDIDATE,
        score: d.score,
        rank: d.rank
    } satisfies CreateMatchResult))

    // store matching result to db
    await storeMatchedItems(storeData);

    // finish the session with match in catch
    await sessionsCache.endSessionWithMatch(sessionData.uuid);
};

const handleVotingFailure = async (
    error: unknown,
    sessionUUID: string
    ) => {

    if (error instanceof DomainError) {
        throw error;
    }

    log.error("[UNEXPECTED ERROR] Matching evaluation failed", {
        sessionUUID,
        error
    });

    terminateSession(
        sessionUUID,
        SessionTerminationReason.UNEXPECTED,
        "Unexpected error during voting evaluation"
    );

    throw new DomainError(
        SessionVotingErrorCode.UNEXPECTED_ERROR,
        "Unexpected error during voting evaluation",
        { sessionUUID }
    );
};

/**
 * Timers to explicitly handle session state lifecycle
 */
export const startCreationTimeout = (
    sessionUUID: string,
    timeoutMs: number
) => {
    clearCreationTimeout(sessionUUID);

    const timer = setTimeout(() => {
        terminateSession(sessionUUID, SessionTerminationReason.SESSION_CREATION_TIMEOUT, `Session creation timeout ${timeoutMs/1000/60} min reached.`)
    }, timeoutMs);

    creationTimeouts.set(sessionUUID, timer);
};

export const startMaxDurationTimeout = (
    sessionUUID: string,
    timeoutMs: number
) => {
    clearMaxDurationTimeout(sessionUUID);

    const timer = setTimeout(() => {
        terminateSession(sessionUUID, SessionTerminationReason.SESSION_CREATION_TIMEOUT, `Session max duration timeout ${timeoutMs/1000/60} min reached.`)
    }, timeoutMs);

    maxDurationTimeouts.set(sessionUUID, timer);
};

export const clearCreationTimeout = (sessionUUID: string) => {
    const timer = creationTimeouts.get(sessionUUID);
    if (timer) {
        clearTimeout(timer);
        creationTimeouts.delete(sessionUUID);
    }
};

export const clearMaxDurationTimeout = (sessionUUID: string) => {
    const timer = maxDurationTimeouts.get(sessionUUID);
    if (timer) {
        clearTimeout(timer);
        maxDurationTimeouts.delete(sessionUUID);
    }
};

export const clearAllTimeouts = (sessionUUID: string) => {
    clearCreationTimeout(sessionUUID);
    clearMaxDurationTimeout(sessionUUID);
};

/**
 * Session initialization data
 */
export const getInitMovieSessionData = async () => {
    return await gateway.requestRecommendationInitData(SessionType.MOVIE)
};

export const updateInitMoviesVotingResults = async (userUUID: string, votingResults: SessionUpdateParams) => {
    await insertUserMovieInitVotingResults(userUUID, votingResults.votingResult);
};

export const isSessionInitialized = async (userUUID: string, sessionType: SessionType) => {
    return await checkUserHasSessionHistoryData(userUUID, sessionType);
};