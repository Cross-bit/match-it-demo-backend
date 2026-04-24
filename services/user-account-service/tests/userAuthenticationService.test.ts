jest.mock("../src/database/usersDatabase", () => ({
    getUserByEmail: jest.fn(),
}));

jest.mock("bcrypt", () => ({
    __esModule: true,
    default: {
        compareSync: jest.fn(),
    },
}));

import bcrypt from "bcrypt";
import { getUserByEmail } from "../src/database/usersDatabase";
import { AuthenticationStatusCode } from "../src/services/DTOInterface";
import { authenticateUserWithCredentials } from "../src/services/userAuthenticationService";

const getUserByEmailMock = getUserByEmail as jest.Mock;
const compareSyncMock = (bcrypt.compareSync as unknown) as jest.Mock;

describe("userAuthenticationService", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, REQUIRE_EMAIL_VERIFICATION: "1" };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test("returns NOT_EXIST when user does not exist", async () => {
        getUserByEmailMock.mockResolvedValue(null);

        const result = await authenticateUserWithCredentials({
            email: "unknown@test.dev",
            password: "pwd",
        });

        expect(result.result).toBe(AuthenticationStatusCode.NOT_EXIST);
    });

    test("returns NOT_VERIFIED when user is not verified and verification is required", async () => {
        getUserByEmailMock.mockResolvedValue({
            name: "Alice",
            id: 10,
            uuid: "uuid-1",
            authentication_method: "CREDENTIALS",
            access_rights: "USER",
            passwordRec: {
                is_verified: false,
                password_hash: "hash",
            },
        });

        const result = await authenticateUserWithCredentials({
            email: "alice@test.dev",
            password: "pwd",
        });

        expect(result.result).toBe(AuthenticationStatusCode.NOT_VERIFIED);
    });

    test("returns INVALID_PASSWORD when password does not match", async () => {
        getUserByEmailMock.mockResolvedValue({
            name: "Alice",
            id: 10,
            uuid: "uuid-1",
            authentication_method: "CREDENTIALS",
            access_rights: "USER",
            passwordRec: {
                is_verified: true,
                password_hash: "hash",
            },
        });
        compareSyncMock.mockReturnValue(false);

        const result = await authenticateUserWithCredentials({
            email: "alice@test.dev",
            password: "wrong",
        });

        expect(result.result).toBe(AuthenticationStatusCode.INVALID_PASSWORD);
    });

    test("returns OK with user payload when credentials are valid", async () => {
        getUserByEmailMock.mockResolvedValue({
            name: "Alice",
            id: 10,
            uuid: "uuid-1",
            authentication_method: "CREDENTIALS",
            access_rights: "USER",
            passwordRec: {
                is_verified: true,
                password_hash: "hash",
            },
        });
        compareSyncMock.mockReturnValue(true);

        const result = await authenticateUserWithCredentials({
            email: "alice@test.dev",
            password: "correct",
        });

        expect(result.result).toBe(AuthenticationStatusCode.OK);
        expect(result.userToken).toBe("uuid-1");
        expect(result.name).toBe("Alice");
    });
});
