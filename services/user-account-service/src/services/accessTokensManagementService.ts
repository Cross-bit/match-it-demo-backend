import jwt, { JwtPayload } from 'jsonwebtoken'
import * as DTO from './DTOInterface'
import { insertNewRefreshTokenQuery, tryGetRefreshTokenId, tryGetRefreshTokenRecordIdByUserId, updateCurrentRefreshToken } from '../database/tokensDatabase'

/**
 * Generates new access token for a user using provided content (representing JWT claims).
 * @param authoResult object representing user defined claims for JWT.
 * @returns New JWT token string.
 */
export const generateAccessToken = (authoResult: DTO.AuthenticationTokenContent) => {

    const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

    if (!ACCESS_TOKEN_SECRET) {
        console.error("REFRESH_TOKEN_SECRET env was null, during credentials log in. ACCESS_TOKEN_SECRET env not set.");
        throw new Error("Fatal internal server error while trying to log in.");
    }

    const SERVICE_IDENTIFIER = process.env.IDENTIFIER;

    const ACCESS_TOKEN_EXPIRATION_TIME = process.env.ACCESS_TOKEN_EXPIRATION_TIME ?? "5m";

    if (!SERVICE_IDENTIFIER) {
        console.error("JWT access token was null, during credentials log in. IDENTIFIER env not set.");
        throw new Error("Fatal internal server error while trying to log in.");
    }

    // fields: https://www.rfc-editor.org/rfc/rfc7519#section-4.1
    return jwt.sign({
        // custom claims:
        email: authoResult.userEmail,
        privilidge: authoResult.privilidge,
        isRefresh: false
    },
    ACCESS_TOKEN_SECRET,
    {
        expiresIn: ACCESS_TOKEN_EXPIRATION_TIME,
        subject: authoResult.userUUID,
        issuer: SERVICE_IDENTIFIER
    });
}
/**
 * Generates new refresh token for a user using provided content (representing JWT claims).
 * @param tokenData object representing user defined claims for JWT.
 * @returns New JWT token string.
 */
export const generateRefreshToken = (tokenData: DTO.AuthenticationTokenContent) => {

    const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

    if (!REFRESH_TOKEN_SECRET) {
        console.error("REFRESH_TOKEN_SECRET env was null, during credentials log in.");
        throw new Error("Fatal internal server error while trying to log in.");
    }

    const SERVICE_IDENTIFIER = process.env.IDENTIFIER;

    if (!SERVICE_IDENTIFIER) {
        console.error("JWT access token was null, during credentials log in. IDENTIFIER env not set.");
        throw new Error("Fatal internal server error while trying to log in.");
    }

    const REFRESH_TOKEN_EXPIRATION_TIME = process.env.REFRESH_TOKEN_EXPIRATION_TIME ?? "30m";

    if (!SERVICE_IDENTIFIER) {
        console.error("JWT access token was null, during credentials log in. IDENTIFIER env not set.");
        throw new Error("Fatal internal server error while trying to log in.");
    }

    return jwt.sign({
        email: tokenData.userEmail,
        privilidge: tokenData.privilidge,
        isRefresh: false
    },
    REFRESH_TOKEN_SECRET,
    {
        expiresIn: REFRESH_TOKEN_EXPIRATION_TIME,
        subject: tokenData.userUUID,
        issuer: SERVICE_IDENTIFIER
    });

}
/**
 * Performs check that user's refresh token exist in local database.
 * @param userId
 * @returns
 */
export const checkUserHasRefreshToken = async (userId: number) : Promise<boolean> => { // Currently user is logged in if has refresh token in database
    return await tryGetRefreshTokenRecordIdByUserId(userId) != -1;
}

export const updateRefreshToken = async (userId: number, newRefreshToken: string) : Promise<void> =>
{
    const refreshTokenRecordId = await tryGetRefreshTokenRecordIdByUserId(userId);

    if (refreshTokenRecordId != -1) {
        return await updateCurrentRefreshToken(refreshTokenRecordId, newRefreshToken);
    }
    else {
        return await insertNewRefreshTokenQuery(userId, newRefreshToken);
    }
}

/**
 * Updates user access token once expires using provided users refresh token.
 * @param refreshToken Users refresh token.
 * @returns New access token string.
 */
export const regenerateAccessToken = async (refreshToken: string) : Promise<string | undefined> =>
{

    const refreshTokenId = await tryGetRefreshTokenId(refreshToken);

    if (refreshTokenId == -1) {
        // return 403
        throw Error("Refresh token is not recognized!");
    }

    const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

    if (!REFRESH_TOKEN_SECRET) {
        console.error("REFRESH_TOKEN_SECRET env was null, during token refresh.");
        throw new Error("Fatal internal server error while trying to refresh error.");
    }

    return new Promise((resolve, reject) => {
        jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, payload) => {
            if (err) {

                return reject(err); // Reject the promise with the error
            } else {

                if (!payload) {
                    return reject("Invalid refresh token payload!");
                }

                const payloadJwt: JwtPayload = payload as JwtPayload;

                if (!payloadJwt.sub) {
                    return reject("Invalid refresh token payload!");
                }

                const newAccessToken = generateAccessToken({
                    userUUID: payloadJwt?.sub, // user id
                    userEmail: payloadJwt.userEmail,
                    privilidge: payloadJwt.privilidge });

                return resolve(newAccessToken); // Resolve the promise with the new access token
            }
        });
    });
}