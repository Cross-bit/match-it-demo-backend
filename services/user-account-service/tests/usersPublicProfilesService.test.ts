jest.mock("../src/database/usersDatabase", () => ({
    getPulicUsersProfilesByUUIDs: jest.fn(),
}));

jest.mock("../src/services/imageStorage/imageStoreUtils", () => ({
    constructImageUrl: jest.fn(),
}));

import { getPulicUsersProfilesByUUIDs } from "../src/database/usersDatabase";
import { constructImageUrl } from "../src/services/imageStorage/imageStoreUtils";
import { getUsersProfiles } from "../src/services/usersPublicProfilesService";

const getPulicUsersProfilesByUUIDsMock = getPulicUsersProfilesByUUIDs as jest.Mock;
const constructImageUrlMock = constructImageUrl as jest.Mock;

describe("usersPublicProfilesService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns null when profiles query returns null", async () => {
        getPulicUsersProfilesByUUIDsMock.mockResolvedValue(null);
        await expect(getUsersProfiles(["u-1"])).resolves.toBeNull();
    });

    test("maps profile without picture to avatarUrl null", async () => {
        getPulicUsersProfilesByUUIDsMock.mockResolvedValue([
            {
                uuid: "u-1",
                name: "Alice",
                profile_picture: null,
            },
        ]);

        const result = await getUsersProfiles(["u-1"]);

        expect(result).toEqual([
            {
                uuid: "u-1",
                name: "Alice",
                avatarUrl: null,
            },
        ]);
        expect(constructImageUrlMock).not.toHaveBeenCalled();
    });

    test("maps profile with picture using constructImageUrl", async () => {
        getPulicUsersProfilesByUUIDsMock.mockResolvedValue([
            {
                uuid: "u-1",
                name: "Alice",
                profile_picture: {
                    server_url: "https://cdn",
                    server_path: "/avatars",
                    creation_time: Date.now(),
                    name: "alice.png",
                },
            },
        ]);
        constructImageUrlMock.mockResolvedValue("https://cdn/avatars/alice.png");

        const result = await getUsersProfiles(["u-1"]);

        expect(result).toEqual([
            {
                uuid: "u-1",
                name: "Alice",
                avatarUrl: "https://cdn/avatars/alice.png",
            },
        ]);
        expect(constructImageUrlMock).toHaveBeenCalledTimes(1);
    });
});
