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
    },
    requestEndOfRecommendation: jest.fn(),
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
import { getSessionByUUID } from "../src/database/sessionsManagementDatabase";
import { SessionState } from "../src/interface";
import { DomainError, SessionConnectionErrorCode, SessionMemberErrorCode, SessionStartErrorCode } from "../src/errors/DomainError";
import { SessionNotFoundError } from "../src/errors/SessionNotFoundError";
import { sessionsCache } from "../src/services/session/SessionsCachingService";
import { connectUserToSession, disconnectUserFromSession, getSessionState } from "../src/services/session/sessionManagementService";

const getSessionDataMock = sessionsCache.getSessionData as jest.Mock;
const tryConnectMemberToSessionMock = sessionsCache.tryConnectMemberToSession as jest.Mock;
const tryDisconnectMemberFromSessionMock = sessionsCache.tryDisconnectMemberFromSession as jest.Mock;
const checkSessionIsEmptyMock = sessionsCache.checkSessionIsEmpty as jest.Mock;
const getSessionByUUIDMock = getSessionByUUID as jest.Mock;
const sendReliableManyMock = webSocketManager.sendReliableMany as jest.Mock;

describe("sessionManagementService core flows", () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
});
