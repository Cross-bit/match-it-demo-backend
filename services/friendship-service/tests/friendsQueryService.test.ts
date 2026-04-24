jest.mock("../src/database/usersDatabase", () => ({
    searchUserByEmail: jest.fn(),
    getUserIdByUUID: jest.fn(),
    getAllFriendsByUUID: jest.fn(),
}));

jest.mock("../src/database/friendsDatabase", () => ({
    getPendingRequestsByUserUUID: jest.fn(),
}));

jest.mock("../src/database/imagesDatabase", () => ({
    getUserProfilePictureByUserUUIDs: jest.fn(),
}));

import {
    getAllFriendsByUUID,
    getUserIdByUUID,
    searchUserByEmail,
} from "../src/database/usersDatabase";
import { getPendingRequestsByUserUUID } from "../src/database/friendsDatabase";
import { getUserProfilePictureByUserUUIDs } from "../src/database/imagesDatabase";
import {
    constructImageUrl,
    findPersonByEmail,
    getAllUsersFriends,
} from "../src/services/friendsQueryService";

const searchUserByEmailMock = searchUserByEmail as jest.Mock;
const getPendingRequestsByUserUUIDMock = getPendingRequestsByUserUUID as jest.Mock;
const getUserIdByUUIDMock = getUserIdByUUID as jest.Mock;
const getAllFriendsByUUIDMock = getAllFriendsByUUID as jest.Mock;
const getUserProfilePictureByUserUUIDsMock = getUserProfilePictureByUserUUIDs as jest.Mock;

describe("friendsQueryService", () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    test("findPersonByEmail returns null when searched user is missing", async () => {
        searchUserByEmailMock.mockResolvedValue(null);

        const result = await findPersonByEmail("initiator-1", "user@test.dev");
        expect(result).toBeNull();
    });

    test("findPersonByEmail returns null for identity match", async () => {
        searchUserByEmailMock.mockResolvedValue({
            uid: "initiator-1",
            name: "Self",
            email: "self@test.dev",
            isFriend: false,
        });

        const result = await findPersonByEmail("initiator-1", "self@test.dev");
        expect(result).toBeNull();
    });

    test("findPersonByEmail returns mapped DTO and invitation flag", async () => {
        searchUserByEmailMock.mockResolvedValue({
            uid: "target-1",
            name: "Target",
            email: "target@test.dev",
            isFriend: false,
        });
        getPendingRequestsByUserUUIDMock.mockResolvedValue([
            { user_id: 99 },
            { user_id: 5 },
        ]);
        getUserIdByUUIDMock.mockResolvedValue(5);

        const result = await findPersonByEmail("initiator-1", "target@test.dev");

        expect(result).toEqual({
            uuid: "target-1",
            name: "Target",
            email: "target@test.dev",
            isFriend: false,
            hasInvitation: true,
        });
    });

    test("getAllUsersFriends returns empty list on null db response", async () => {
        getAllFriendsByUUIDMock.mockResolvedValue(null);
        await expect(getAllUsersFriends("u-1")).resolves.toEqual([]);
    });

    test("getAllUsersFriends maps profile pictures to URLs", async () => {
        getAllFriendsByUUIDMock.mockResolvedValue([
            { uid: "u-2", name: "Alice", email: "a@test.dev" },
            { uid: "u-3", name: "Bob", email: "b@test.dev" },
        ]);
        getUserProfilePictureByUserUUIDsMock.mockResolvedValue([
            {
                ownerUUID: "u-2",
                serverUrl: "https://cdn",
                serverPath: "/avatars",
                name: "a.png",
            },
        ]);

        const result = await getAllUsersFriends("u-1");

        expect(result).toEqual([
            {
                uuid: "u-2",
                name: "Alice",
                email: "a@test.dev",
                profilePicUrl: expect.stringContaining("cdn"),
            },
            {
                uuid: "u-3",
                name: "Bob",
                email: "b@test.dev",
                profilePicUrl: "",
            },
        ]);
    });

    test("constructImageUrl returns empty string on null metadata", () => {
        expect(constructImageUrl(null)).toBe("");
    });
});
