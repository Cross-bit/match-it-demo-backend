jest.mock("../src/database/tokensDatabase", () => ({
    insertNewRefreshTokenQuery: jest.fn(),
    tryGetRefreshTokenId: jest.fn(),
    tryGetRefreshTokenRecordIdByUserId: jest.fn(),
    updateCurrentRefreshToken: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
    __esModule: true,
    default: {
        sign: jest.fn(),
        verify: jest.fn(),
    },
}));

import jwt from "jsonwebtoken";
import {
    insertNewRefreshTokenQuery,
    tryGetRefreshTokenId,
    tryGetRefreshTokenRecordIdByUserId,
    updateCurrentRefreshToken,
} from "../src/database/tokensDatabase";
import {
    checkUserHasRefreshToken,
    generateAccessToken,
    regenerateAccessToken,
    updateRefreshToken,
} from "../src/services/accessTokensManagementService";

const jwtSignMock = (jwt.sign as unknown) as jest.Mock;
const jwtVerifyMock = (jwt.verify as unknown) as jest.Mock;
const tryGetRefreshTokenRecordIdByUserIdMock = tryGetRefreshTokenRecordIdByUserId as jest.Mock;
const updateCurrentRefreshTokenMock = updateCurrentRefreshToken as jest.Mock;
const insertNewRefreshTokenQueryMock = insertNewRefreshTokenQuery as jest.Mock;
const tryGetRefreshTokenIdMock = tryGetRefreshTokenId as jest.Mock;

describe("accessTokensManagementService", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test("generateAccessToken throws when ACCESS_TOKEN_SECRET is missing", () => {
        delete process.env.ACCESS_TOKEN_SECRET;
        process.env.IDENTIFIER = "svc";

        expect(() =>
            generateAccessToken({
                userUUID: "u-1",
                userEmail: "u@test.dev",
                privilidge: "USER" as any,
            })
        ).toThrow("Fatal internal server error while trying to log in.");
    });

    test("generateAccessToken signs JWT with expected claims", () => {
        process.env.ACCESS_TOKEN_SECRET = "secret-a";
        process.env.IDENTIFIER = "svc";
        process.env.ACCESS_TOKEN_EXPIRATION_TIME = "10m";
        jwtSignMock.mockReturnValue("access-token");

        const result = generateAccessToken({
            userUUID: "u-1",
            userEmail: "u@test.dev",
            privilidge: "USER" as any,
        });

        expect(result).toBe("access-token");
        expect(jwtSignMock).toHaveBeenCalledWith(
            expect.objectContaining({
                email: "u@test.dev",
                isRefresh: false,
            }),
            "secret-a",
            expect.objectContaining({
                subject: "u-1",
                issuer: "svc",
                expiresIn: "10m",
            })
        );
    });

    test("checkUserHasRefreshToken returns true when token row exists", async () => {
        tryGetRefreshTokenRecordIdByUserIdMock.mockResolvedValue(42);
        await expect(checkUserHasRefreshToken(1)).resolves.toBe(true);
    });

    test("updateRefreshToken updates existing record", async () => {
        tryGetRefreshTokenRecordIdByUserIdMock.mockResolvedValue(5);
        await updateRefreshToken(10, "token-new");
        expect(updateCurrentRefreshTokenMock).toHaveBeenCalledWith(5, "token-new");
        expect(insertNewRefreshTokenQueryMock).not.toHaveBeenCalled();
    });

    test("updateRefreshToken inserts new record when missing", async () => {
        tryGetRefreshTokenRecordIdByUserIdMock.mockResolvedValue(-1);
        await updateRefreshToken(10, "token-new");
        expect(insertNewRefreshTokenQueryMock).toHaveBeenCalledWith(10, "token-new");
    });

    test("regenerateAccessToken throws when refresh token is unknown", async () => {
        tryGetRefreshTokenIdMock.mockResolvedValue(-1);
        await expect(regenerateAccessToken("missing-token")).rejects.toThrow("Refresh token is not recognized!");
    });

    test("regenerateAccessToken returns new access token for valid refresh token", async () => {
        tryGetRefreshTokenIdMock.mockResolvedValue(9);
        process.env.REFRESH_TOKEN_SECRET = "refresh-secret";
        process.env.ACCESS_TOKEN_SECRET = "access-secret";
        process.env.IDENTIFIER = "svc";
        jwtVerifyMock.mockImplementation((_token: string, _secret: string, cb: Function) =>
            cb(null, { sub: "u-1", userEmail: "u@test.dev", privilidge: "USER" })
        );
        jwtSignMock.mockReturnValue("new-access-token");

        await expect(regenerateAccessToken("refresh-token")).resolves.toBe("new-access-token");
    });
});
