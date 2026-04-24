jest.mock("../src/config/env", () => ({
    env: {
        SESSION_CREATION_TIMEOUT_MS: 300000,
        SESSION_MAX_DURATION_MS: 3600000,
        APP_CLIENT_UUID: "app-client",
    },
}));

jest.mock("../src/logger", () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        child: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        }),
    },
}));

jest.mock("../src/services/session/SessionsCachingService", () => ({
    sessionsCache: {
        addNewSession: jest.fn(),
        getSessionData: jest.fn(),
        getSessionDataByConnectedUserUUID: jest.fn(),
        isUserConnectedInSession: jest.fn(),
        tryConnectMemberToSession: jest.fn(),
        tryDisconnectMemberFromSession: jest.fn(),
        terminateSession: jest.fn(),
        checkSessionIsEmpty: jest.fn(),
        startSession: jest.fn(),
        endSessionWithMatch: jest.fn(),
        updateUserSessionMetadata: jest.fn(),
        updateGroupUUIDMetadata: jest.fn(),
    },
}));

jest.mock("../src/database/sessionsManagementDatabase", () => ({
    checkUserHasSessionHistoryData: jest.fn(),
    getUsersSessionByUUID: jest.fn(),
    markSessionsAsBroken: jest.fn(),
    insertUserMovieInitVotingResults: jest.fn(),
    getSessionByUUID: jest.fn(),
    getAllUsersHistorySessionsWithAllowedState: jest.fn(),
    storeMatchedItems: jest.fn(),
}));

jest.mock("../src/api/ws/manager/wsManager", () => ({
    webSocketManager: {
        sendReliableMany: jest.fn(),
        sendReliable: jest.fn(),
    },
}));

jest.mock("../src/services/RecommendationServices/RecommendationSystemGateway", () => ({
    gateway: {
        requestRecommendationInitData: jest.fn(),
        requestEndOfRecommendation: jest.fn(),
    },
}));

jest.mock("../src/services/session/SessionCoordinator", () => ({
    sessionContentService: {
        clearAllSessionData: jest.fn(),
        getNextUserSessionData: jest.fn(),
    },
}));

jest.mock("../src/services/FCM/sessionInviteNotifications", () => ({
    sendFCMDataMessage: jest.fn(),
}));

jest.mock("../src/database/usersDatabase", () => ({
    createNewGroup: jest.fn(),
    getUserDataByUserUUID: jest.fn(),
    tryGetGroupByUserUUIDs: jest.fn(),
}));

jest.mock("../src/services/chatting/chatService", () => ({
    storeAndRouteIncomingMessage: jest.fn(),
}));

import { webSocketManager } from "../src/api/ws/manager/wsManager";
import { getSessionByUUID, getUsersSessionByUUID, markSessionsAsBroken, storeMatchedItems } from "../src/database/sessionsManagementDatabase";
import { SessionState, SessionType } from "../src/interface";
import { DomainError, SessionConnectionErrorCode, SessionCreationErrorCode, SessionMemberErrorCode, SessionStartErrorCode, SessionVotingErrorCode } from "../src/errors/DomainError";
import { SessionNotFoundError } from "../src/errors/SessionNotFoundError";
import { sessionsCache } from "../src/services/session/SessionsCachingService";
import { gateway } from "../src/services/RecommendationServices/RecommendationSystemGateway";
import { sessionContentService } from "../src/services/session/SessionCoordinator";
import { storeAndRouteIncomingMessage } from "../src/services/chatting/chatService";
import {
    clearAllTimeouts,
    connectUserToSession,
    createNewSession,
    disconnectUserFromSession,
    getSessionState,
    handleUserFinishedDeckVoting,
    startSessionRecommendation,
    terminateSession,
} from "../src/services/session/sessionManagementService";
import { SessionTerminationReason } from "../src/api/ws/manager/ws.dto";

const getSessionDataMock = sessionsCache.getSessionData as jest.Mock;
const tryConnectMemberToSessionMock = sessionsCache.tryConnectMemberToSession as jest.Mock;
const tryDisconnectMemberFromSessionMock = sessionsCache.tryDisconnectMemberFromSession as jest.Mock;
const checkSessionIsEmptyMock = sessionsCache.checkSessionIsEmpty as jest.Mock;
const addNewSessionMock = sessionsCache.addNewSession as jest.Mock;
const terminateSessionCacheMock = sessionsCache.terminateSession as jest.Mock;
const startSessionCacheMock = sessionsCache.startSession as jest.Mock;
const endSessionWithMatchMock = sessionsCache.endSessionWithMatch as jest.Mock;
const updateUserSessionMetadataMock = sessionsCache.updateUserSessionMetadata as jest.Mock;
const getSessionByUUIDMock = getSessionByUUID as jest.Mock;
const getUsersSessionByUUIDMock = getUsersSessionByUUID as jest.Mock;
const markSessionsAsBrokenMock = markSessionsAsBroken as jest.Mock;
const storeMatchedItemsMock = storeMatchedItems as jest.Mock;
const sendReliableManyMock = webSocketManager.sendReliableMany as jest.Mock;
const requestEndOfRecommendationMock = gateway.requestEndOfRecommendation as jest.Mock;
const getNextUserSessionDataMock = sessionContentService.getNextUserSessionData as jest.Mock;
const storeAndRouteIncomingMessageMock = storeAndRouteIncomingMessage as jest.Mock;
let consoleWarnSpy: jest.SpyInstance;

describe("sessionManagementService core flows", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
        consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
        jest.clearAllTimers();
    });

    test("connectUserToSession notifies other connected members on success", async () => {
        tryConnectMemberToSessionMock.mockResolvedValue(true);
        getSessionDataMock.mockReturnValue({
            uuid: "s-1",
            members: [
                { uuid: "u-1", isConnected: true, isCreator: false },
                { uuid: "u-2", isConnected: true, isCreator: true },
                { uuid: "u-3", isConnected: false, isCreator: false },
            ],
        });

        await connectUserToSession("u-1", "s-1");

        expect(tryConnectMemberToSessionMock).toHaveBeenCalledWith("s-1", "u-1");
        expect(sendReliableManyMock).toHaveBeenCalledWith(
            expect.objectContaining({ userUUID: "u-1" }),
            expect.anything(),
            ["u-2"]
        );
    });

    test("connectUserToSession maps SessionNotFoundError to DomainError", async () => {
        tryConnectMemberToSessionMock.mockRejectedValue(new SessionNotFoundError("s-404"));

        await expect(connectUserToSession("u-1", "s-404")).rejects.toMatchObject({
            code: SessionConnectionErrorCode.SESSION_NOT_FOUND,
        });
    });

    test("connectUserToSession throws SESSION_ALREADY_RUNNING when connect rejected", async () => {
        tryConnectMemberToSessionMock.mockResolvedValue(false);

        await expect(connectUserToSession("u-1", "s-1")).rejects.toMatchObject({
            code: SessionConnectionErrorCode.SESSION_ALREADY_RUNNING,
        });
    });

    test("disconnectUserFromSession throws USER_NOT_IN_SESSION when user is not member", async () => {
        tryDisconnectMemberFromSessionMock.mockResolvedValue(false);

        await expect(disconnectUserFromSession("u-1", "s-1")).rejects.toMatchObject({
            code: SessionMemberErrorCode.USER_NOT_IN_SESSION,
        });
    });

    test("disconnectUserFromSession maps SessionNotFoundError to DomainError", async () => {
        tryDisconnectMemberFromSessionMock.mockRejectedValue(new SessionNotFoundError("s-404"));

        await expect(disconnectUserFromSession("u-1", "s-404")).rejects.toMatchObject({
            code: SessionStartErrorCode.SESSION_NOT_FOUND,
        });
    });

    test("getSessionState returns state from cache when available", async () => {
        getSessionDataMock.mockReturnValue({ sessionState: SessionState.RUNNING });

        await expect(getSessionState("s-1")).resolves.toBe(SessionState.RUNNING);
        expect(getSessionByUUIDMock).not.toHaveBeenCalled();
    });

    test("getSessionState falls back to DB when cache miss", async () => {
        getSessionDataMock.mockReturnValue(null);
        getSessionByUUIDMock.mockResolvedValue({ session_state: SessionState.MATCHED });

        await expect(getSessionState("s-db")).resolves.toBe(SessionState.MATCHED);
    });

    test("getSessionState throws DomainError when session is not found anywhere", async () => {
        getSessionDataMock.mockReturnValue(null);
        getSessionByUUIDMock.mockResolvedValue(null);

        await expect(getSessionState("s-404")).rejects.toBeInstanceOf(DomainError);
        await expect(getSessionState("s-404")).rejects.toMatchObject({
            code: SessionStartErrorCode.SESSION_NOT_FOUND,
        });
    });

    test("createNewSession marks creator stale sessions as broken", async () => {
        getUsersSessionByUUIDMock.mockResolvedValue([{ id: 11 }, { id: 12 }]);
        addNewSessionMock.mockResolvedValue({
            id: 100,
            uuid: "s-new",
            members: [],
            sessionState: SessionState.CREATED,
            currentRealSize: 1,
            creationSize: 1,
            creationTime: new Date(),
            sessionType: SessionType.MOVIE,
        });

        await createNewSession({
            creatorUUID: "u-creator",
            invitedMemberUUIDs: [],
            sessionType: SessionType.MOVIE,
        });

        expect(markSessionsAsBrokenMock).toHaveBeenCalledWith([11, 12]);
        expect(addNewSessionMock).toHaveBeenCalled();
        clearAllTimeouts("s-new");
    });

    test("createNewSession wraps failure into CREATION_FAILED DomainError", async () => {
        getUsersSessionByUUIDMock.mockResolvedValue([]);
        addNewSessionMock.mockRejectedValue(new Error("db-fail"));

        await expect(
            createNewSession({
                creatorUUID: "u-creator",
                invitedMemberUUIDs: [],
                sessionType: SessionType.MOVIE,
            })
        ).rejects.toMatchObject({
            code: SessionCreationErrorCode.CREATION_FAILED,
        });
    });

    test("startSessionRecommendation rejects non-creator", async () => {
        getSessionDataMock.mockResolvedValue({
            uuid: "s-1",
            sessionType: SessionType.MOVIE,
            currentRealSize: 2,
            members: [
                { uuid: "u-creator", isCreator: true, isConnected: true },
                { uuid: "u-user", isCreator: false, isConnected: true },
            ],
        });

        await expect(startSessionRecommendation("u-user", "s-1")).rejects.toMatchObject({
            code: SessionStartErrorCode.USER_NOT_CREATOR,
        });
        expect(startSessionCacheMock).not.toHaveBeenCalled();
    });

    test("startSessionRecommendation starts and notifies connected users", async () => {
        getSessionDataMock.mockResolvedValue({
            uuid: "s-1",
            sessionType: SessionType.MOVIE,
            currentRealSize: 2,
            members: [
                { uuid: "u-creator", isCreator: true, isConnected: true },
                { uuid: "u-user", isCreator: false, isConnected: true },
                { uuid: "u-offline", isCreator: false, isConnected: false },
            ],
        });
        startSessionCacheMock.mockResolvedValue(undefined);

        await startSessionRecommendation("u-creator", "s-1");

        expect(startSessionCacheMock).toHaveBeenCalledWith("u-creator", "s-1");
        expect(sendReliableManyMock).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionInfo: expect.objectContaining({ sessionUUID: "s-1" }),
            }),
            expect.anything(),
            ["u-creator", "u-user"]
        );
    });

    test("terminateSession returns false for missing session", async () => {
        terminateSessionCacheMock.mockRejectedValue(new SessionNotFoundError("s-missing"));
        await expect(terminateSession("s-missing")).resolves.toBe(false);
    });

    test("terminateSession sends WS event and recommendation end for running session", async () => {
        terminateSessionCacheMock.mockResolvedValue({
            id: 50,
            uuid: "s-1",
            sessionState: SessionState.RUNNING,
            sessionType: SessionType.MOVIE,
            currentRealSize: 2,
            members: [
                { uuid: "u-1", isCreator: true },
                { uuid: "u-2", isCreator: false },
            ],
        });

        await expect(terminateSession("s-1", SessionTerminationReason.UNEXPECTED, "boom")).resolves.toBe(true);

        expect(sendReliableManyMock).toHaveBeenCalled();
        expect(requestEndOfRecommendationMock).toHaveBeenCalledWith(
            expect.objectContaining({
                session: expect.objectContaining({ sessionUUID: "s-1" }),
            })
        );
    });

    test("handleUserFinishedDeckVoting stores match and ends session when matched", async () => {
        getSessionDataMock.mockResolvedValue({
            id: 77,
            uuid: "s-1",
            sessionType: SessionType.MOVIE,
            currentRealSize: 2,
            members: [{ uuid: "u-1", isCreator: true, isConnected: true }],
        });
        updateUserSessionMetadataMock.mockResolvedValue(true);
        getNextUserSessionDataMock.mockResolvedValue({
            matched: true,
            sessionType: SessionType.MOVIE,
            matchedItemUUID: "match-uuid",
            nextDeckOfCards: {},
            matchedItems: [{ itemId: "m1", rank: 1, run: 1, score: 0.9 }],
        });
        storeAndRouteIncomingMessageMock.mockResolvedValue(undefined);
        storeMatchedItemsMock.mockResolvedValue(undefined);
        endSessionWithMatchMock.mockResolvedValue(undefined);

        await handleUserFinishedDeckVoting("u-1", {
            sessionUUID: "s-1",
            votingResult: [{ itemId: "m1", rating: 1 }],
        });

        expect(updateUserSessionMetadataMock).toHaveBeenCalled();
        expect(storeMatchedItemsMock).toHaveBeenCalled();
        expect(endSessionWithMatchMock).toHaveBeenCalledWith("s-1");
    });

    test("handleUserFinishedDeckVoting wraps unexpected errors", async () => {
        getSessionDataMock.mockResolvedValue({
            id: 77,
            uuid: "s-1",
            sessionType: SessionType.MOVIE,
            currentRealSize: 2,
            members: [{ uuid: "u-1", isCreator: true, isConnected: true }],
        });
        updateUserSessionMetadataMock.mockResolvedValue(true);
        getNextUserSessionDataMock.mockRejectedValue(new Error("unexpected"));
        terminateSessionCacheMock.mockResolvedValue({
            id: 77,
            uuid: "s-1",
            sessionState: SessionState.RUNNING,
            sessionType: SessionType.MOVIE,
            currentRealSize: 2,
            members: [{ uuid: "u-1", isCreator: true }],
        });

        await expect(
            handleUserFinishedDeckVoting("u-1", {
                sessionUUID: "s-1",
                votingResult: [{ itemId: "m1", rating: 1 }],
            })
        ).rejects.toMatchObject({
            code: SessionVotingErrorCode.UNEXPECTED_ERROR,
        });
    });

    test("creation timeout triggers auto-termination", async () => {
        jest.useFakeTimers();
        terminateSessionCacheMock.mockResolvedValue({
            id: 1,
            uuid: "s-timeout",
            sessionState: SessionState.CREATED,
            sessionType: SessionType.MOVIE,
            currentRealSize: 1,
            members: [],
        });
        getUsersSessionByUUIDMock.mockResolvedValue([]);
        addNewSessionMock.mockResolvedValue({
            id: 1,
            uuid: "s-timeout",
            members: [],
            sessionState: SessionState.CREATED,
            currentRealSize: 1,
            creationSize: 1,
            creationTime: new Date(),
            sessionType: SessionType.MOVIE,
        });

        await createNewSession({
            creatorUUID: "u-creator",
            invitedMemberUUIDs: [],
            sessionType: SessionType.MOVIE,
        });

        jest.advanceTimersByTime(300000);
        await Promise.resolve();

        expect(terminateSessionCacheMock).toHaveBeenCalledWith("s-timeout");
        clearAllTimeouts("s-timeout");
    });
});
