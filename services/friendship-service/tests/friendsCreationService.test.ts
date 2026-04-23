jest.mock("../src/database/friendsDatabase", () => ({
    checkFriendshipByUUID: jest.fn(),
    createNewPendingRequest: jest.fn(),
    getAllPendingUsersByUserUUID: jest.fn(),
    tryResolvePendingRequest: jest.fn(),
}));

jest.mock("../src/database/usersDatabase", () => ({
    getUserById: jest.fn(),
    getUserFcmDataByUUIDs: jest.fn(),
}));

jest.mock("../src/services/FCM/fcmNotifications", () => ({
    sendFCMDataMessage: jest.fn(),
}));

import {
    checkFriendshipByUUID,
    createNewPendingRequest,
    getAllPendingUsersByUserUUID,
} from "../src/database/friendsDatabase";
import { getUserFcmDataByUUIDs } from "../src/database/usersDatabase";
import { setPendingFriendRequest, checkForFriendRequests } from "../src/services/friendsCreationService";

const checkFriendshipByUUIDMock = checkFriendshipByUUID as jest.Mock;
const createNewPendingRequestMock = createNewPendingRequest as jest.Mock;
const getAllPendingUsersByUserUUIDMock = getAllPendingUsersByUserUUID as jest.Mock;
const getUserFcmDataByUUIDsMock = getUserFcmDataByUUIDs as jest.Mock;

describe("friendsCreationService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Keep notification branch deterministic and avoid warning logs in test output.
        getUserFcmDataByUUIDsMock.mockResolvedValue([
            { user_uuid: "user-b", name: "User B", fcm_token: "fcm-token-1" }
        ]);
    });

    test("setPendingFriendRequest returns null when friendship already exists", async () => {
        checkFriendshipByUUIDMock.mockResolvedValue(true);

        const result = await setPendingFriendRequest({
            initiatorId: "user-a",
            friendId: "user-b",
        });

        expect(result).toBeNull();
        expect(createNewPendingRequestMock).not.toHaveBeenCalled();
    });

    test("setPendingFriendRequest returns DTO for created request", async () => {
        checkFriendshipByUUIDMock.mockResolvedValue(false);
        createNewPendingRequestMock.mockResolvedValue({
            uuid: "req-1",
            creation_time: 1710000000,
        });

        const result = await setPendingFriendRequest({
            initiatorId: "user-a",
            friendId: "user-b",
        });

        expect(result).toEqual({
            requestId: "req-1",
            creationTime: 1710000000,
        });
    });

    test("checkForFriendRequests filters current user and maps DTO", async () => {
        getAllPendingUsersByUserUUIDMock.mockResolvedValue([
            {
                uuid: "req-1",
                friend_data: { uid: "user-a", name: "Alice", email: "a@example.com" },
            },
            {
                uuid: "req-2",
                friend_data: { uid: "self-user", name: "Self", email: "self@example.com" },
            },
        ]);

        const result = await checkForFriendRequests("self-user");

        expect(result).toEqual([
            {
                requestId: "req-1",
                friendData: {
                    uuid: "user-a",
                    name: "Alice",
                    email: "a@example.com",
                },
            },
        ]);
    });
});
