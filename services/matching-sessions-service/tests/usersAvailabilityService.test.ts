jest.mock("../src/database/usersDatabase", () => ({
    getUsersFcmsByUserUUIDs: jest.fn(),
}));

jest.mock("../src/services/session/SessionsCachingService", () => ({
    sessionsCache: {
        getSessionDataByConnectedUserUUID: jest.fn(),
    },
}));

import { getUsersFcmsByUserUUIDs } from "../src/database/usersDatabase";
import { sessionsCache } from "../src/services/session/SessionsCachingService";
import {
    checkUserAvailabilityState,
    checkUserHasFcmToken,
    checkUserIsInActiveSession,
} from "../src/services/usersAvailibilityService";
import { AvailableState } from "../src/services/types";

const getUsersFcmsByUserUUIDsMock = getUsersFcmsByUserUUIDs as jest.Mock;
const getSessionDataByConnectedUserUUIDMock = sessionsCache.getSessionDataByConnectedUserUUID as jest.Mock;

describe("usersAvailabilityService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("checkUserAvailabilityState short-circuits on first unavailable predicate", async () => {
        const first = jest.fn().mockResolvedValue(AvailableState.IS_OFFLINE);
        const second = jest.fn().mockResolvedValue(AvailableState.AVAILABLE);

        const result = await checkUserAvailabilityState("user-1", [first, second]);

        expect(result).toBe(AvailableState.IS_OFFLINE);
        expect(first).toHaveBeenCalledWith("user-1");
        expect(second).not.toHaveBeenCalled();
    });

    test("checkUserHasFcmToken returns AVAILABLE when matching FCM record exists", async () => {
        getUsersFcmsByUserUUIDsMock.mockResolvedValue([
            { user_uuid: "user-1", fcm_token: "abc-token" },
        ]);

        const result = await checkUserHasFcmToken("user-1");
        expect(result).toBe(AvailableState.AVAILABLE);
    });

    test("checkUserHasFcmToken returns IS_OFFLINE on missing FCM", async () => {
        getUsersFcmsByUserUUIDsMock.mockResolvedValue([]);

        const result = await checkUserHasFcmToken("user-1");
        expect(result).toBe(AvailableState.IS_OFFLINE);
    });

    test("checkUserIsInActiveSession detects connected session from cache", async () => {
        getSessionDataByConnectedUserUUIDMock.mockReturnValue({ uuid: "s-1" });
        const result = await checkUserIsInActiveSession("user-1");
        expect(result).toBe(AvailableState.IS_IN_ACTIVE_SESSION);
    });
});
