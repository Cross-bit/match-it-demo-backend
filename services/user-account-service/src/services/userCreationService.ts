import { DbErrorMessage, UniqueViolation } from "../database/Errors/databaseError";
import {  UserData } from "../database/interface";
import { createNewUserWithCredentials,
    getUserByEmail, updateUserVerificationById, deleteExistingUserById,
    getUserByUUID,
    deleteAllUsersLoginSessionInfo,
    deleteUserAccountDataByUserId,
    getEmailVerificationToken,
    deleteEmailVerificationToken
} from "../database/usersDatabase";

import { AuthenticationMethod } from "../interface";
import * as DTO from "./DTOInterface"
import { sendVerificationEmail } from "./mailNotificationsService" // solve this so it is not at the same logical level
import * as bcrypt from "bcrypt";
import * as crypto from 'crypto';
import * as norm from "./utils/dataNormalization"
import { deleteRefreshTokenByUserId } from "../database/tokensDatabase";
import logger from "../logger";
import { deleteFcmRecordByUserId } from "../database/fcmDatabase";

const bypassUserMailVerification = (+(process.env.BYPASS_EMAIL_VERIFICATION || 0) == 1)

const saltRounds = 12
const VERIFICATION_SECRET = "6b480e10e5eb58b7f3674368312952f0512a029f6e788c360600350ef009ceb1"

/**
 * Tries to verify user based on the verificationToken
 * @param verificationToken
 * @returns
 */
export const verifyNewUserEmail = async (token: string): Promise<boolean> => {

    const tokenHash = generateVerificationTokenHash(token)
    const record = await getEmailVerificationToken(tokenHash);

    if (!record) {
        return false; // invalid token
    }

    if (new Date(record.expires_at) < new Date()) {
        await deleteEmailVerificationToken(record.id); // cleanup only
        return false;
    }

    await updateUserVerificationById(record.user_id);
    await deleteEmailVerificationToken(record.id); // single-use token

    return true;
};


/**
 * Logouts user from the currently active session.
 * @param userUUID
 */
export const logoutUserFromSession = async (userUUID: string): Promise<void> => {
    const user = await getUserByUUID(userUUID);

    if (user) {
        await deleteRefreshTokenByUserId(user.id);
        await deleteFcmRecordByUserId(user.id)
    }
    else {
        logger.error("Error while trying to logout user, userData returned from database were empty: ", {userUUID})
    }
}

/**
 * Used for complete user account removal.
 * @param userUUID
 */
export const removeUserAccount = async (userUUID: string): Promise<void> => {
    const user: UserData|null = await getUserByUUID(userUUID);

    if (user) {
        if (user.authentication_method == AuthenticationMethod.CREDENTIALS) {
            await deleteUserAccountDataByUserId(user.id);
            //TODO: we should also delete user gallery for profile pictures
        }
    }
    else {
        logger.error("Error while trying to remove user account, userData returned from database were empty: ", { userUUID })
    }
}

/**
 * Creates new user account on "per device basis"... without any credentials etc...
 * @returns
 */
export const createNewUserByDevice = async (): Promise<DTO.UserCreatedResponse> => {
    return new Promise(() => {});
}

export const generateVerificationTokenHash = (token: string) => {
    return crypto
            .createHmac("sha256", VERIFICATION_SECRET)
            .update(token)
            .digest("hex");
}

export const generateVerificationToken = () => {
    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = generateVerificationTokenHash(token)

    return { token, tokenHash };
};

export const createNewUserByCredentials = async (credentials: DTO.UserCredentialsCreate): Promise<DTO.UserCreationResponse> => {
    // we want to make sure user email is normalized...
    credentials.email = norm.normalizeEmail(credentials.email);
    const passwordHash = await bcrypt.hash(credentials.password, saltRounds);

    let verificationTokenPlain: string | null = null;
    let verificationTokenHash: string | null = null;

    if (!bypassUserMailVerification) {
        const tok = generateVerificationToken();
        verificationTokenPlain = tok.token;
        verificationTokenHash = tok.tokenHash;
    }

    try {
        const insertedUser = await createNewUserWithCredentials({
            name: credentials.name,
            email: credentials.email,
            access_rights: credentials.privileges,
            authentication_method: AuthenticationMethod.CREDENTIALS,
            pass_hash: passwordHash,
            is_verified: bypassUserMailVerification,
            verification_token: bypassUserMailVerification ? undefined : {
                token_hash: verificationTokenHash!,
                expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
            }
        });

        if (!bypassUserMailVerification && verificationTokenPlain) {
            await sendVerificationEmail(insertedUser.email, verificationTokenPlain);
            return { status: DTO.UserCreationStatusCode.VERIFICATION_MAIL_SEND };
        }

        return { status: DTO.UserCreationStatusCode.CREATED };
    }
    catch (e) {
        if (e instanceof UniqueViolation) {
            return { status: DTO.UserCreationStatusCode.ALREADY_EXIST };
        }

        throw e
    }
}

export const logoutAllUsers = async (): Promise<boolean> => {
    return await deleteAllUsersLoginSessionInfo()
}

export const createNewUserByGoogleOAutho = async (): Promise<string> => {

    return new Promise(()=>{});
}