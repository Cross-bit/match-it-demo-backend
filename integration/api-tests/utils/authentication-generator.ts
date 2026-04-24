/* =================================================
* DESCRIPTION
* ==================================================
* Helper script to mock users authentication tokens.
*
* )
*/

import { DotenvParseOutput } from "dotenv"
import dotenv from 'dotenv'
import * as settings from '../generalSettings'
import jwt from 'jsonwebtoken'
import type { StringValue } from "ms";

const envVars: DotenvParseOutput | undefined = (() => {

    const res = dotenv.config({ path: settings.ENV_FILE })

    if (res.error)
        throw res.error

    return res.parsed
})()


export enum UserPrivileges { NORMAL = "NORMAL", ADMIN = "ADMIN", TESTER = "TESTER" };

export const generateAccessToken = (userUUID: string, userEmail: string, privilidge: string) => {

    // Keep backward compatibility with old test env typo while preferring the correct key.
    const ACCESS_TOKEN_SECRET = (envVars?.ACCESS_TOKEN_SECRET ?? envVars?.ACCESS_TOKEN_SECRETE) as string;

    if (!ACCESS_TOKEN_SECRET) {
        console.error("REFRESH_TOKEN_SECRETE env was null, during credentials log in. ACCESS_TOKEN_SECRETE env not set.");
        throw new Error("Fatal internal server error while trying to log in.");
    }

    const SERVICE_IDENTIFIER = envVars?.USER_ACCOUNT_SERVICE_IDENTIFIER as string;

    const ACCESS_TOKEN_EXPIRATION_TIME = envVars?.ACCESS_TOKEN_EXPIRATION_TIME as StringValue;

    if (!SERVICE_IDENTIFIER) {
        console.error("JWT access token was null, during credentials log in. IDENTIFIER env not set.");
        throw new Error("Fatal internal server error while trying to log in.");
    }

    return jwt.sign(
    {
        email: userEmail,
        privilidge: privilidge,
        isRefresh: false
    },
    ACCESS_TOKEN_SECRET,
    {
        expiresIn: ACCESS_TOKEN_EXPIRATION_TIME,
        subject: userUUID,
        issuer: SERVICE_IDENTIFIER
    })
}
