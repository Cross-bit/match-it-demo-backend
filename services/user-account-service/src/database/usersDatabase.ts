
import { Client, PoolClient } from 'pg';
import * as db1 from './dbConnection'

import { insertNewUserQuery,
        insertNewUserPasswordQuery,
        getAllUsersQuery,
        deleteUserByIdQuery,
        updateUserVerificationByIdQuery,
        insertNewEmailVerificationToken,
        } from './elementaryQueries/userCreationQueries'

import { checkUserExistByEmail, deleteUserAccount } from './elementaryQueries/usersManagementQueries'
import { deleteAllFCMTokens } from './elementaryQueries/fcmTokenQueries'
import { CreateUserWithCredentials, UserDataWithCredentials, UserData, UserPublicProfile, EmailVerificationHash } from './interface';
import { UserExistQuery } from "./interface"

import { deleteEmailVerificationTokenQuery, getEmailVerificationTokenQuery, getUserByUUIDQuery, getUserPublicProfilesBatchQuery, searchUserByEmailQuery } from './elementaryQueries/userSearchQueries'
import { deleteAllRefreshTokensQuery } from './elementaryQueries/tokenManagementQueries';

////////////////////////////////
//          GETTERS           //
////////////////////////////////

export const checkUserVerified = (query: UserExistQuery) : Promise<boolean> =>
{
    return db1.executeTransaction(async (client: PoolClient) => {
        return await checkUserExistByEmail(client, query);
    });
}

export const checkUserExists = (query: UserExistQuery) : Promise<boolean> =>
{
    return db1.executeTransaction(async (client: PoolClient) => {
        return await checkUserExistByEmail(client, query);
    });
}

export const getAllUsers = () => {
    return db1.executeTransaction(async (client: PoolClient) => {
        return await getAllUsersQuery(client);
    });
}

export const getUserByEmail = (email: string) : Promise<UserDataWithCredentials | null> => {
    return db1.executeTransaction(async (client: PoolClient) => {
        return await searchUserByEmailQuery(client, email);
    });
}

export const getUserByUUID = (uuid: string) : Promise<UserData | null> => {
    return db1.executeTransaction(async (client: PoolClient) => {
        return await getUserByUUIDQuery(client, uuid);
    });
}


export const getPulicUsersProfilesByUUIDs = (uuids: string[]) : Promise<UserPublicProfile[]> => {
    return db1.executeTransaction(async (client: PoolClient) => {
        return await getUserPublicProfilesBatchQuery(client, uuids);
    });
}

export const getEmailVerificationToken = (hash: string) : Promise<EmailVerificationHash> => {
    return db1.executeTransaction(async (client: PoolClient) => {
        return await getEmailVerificationTokenQuery(client, hash);
    });
}

export const deleteEmailVerificationToken = (token_id: number) : Promise<void> => {
    return db1.executeTransaction(async (client: PoolClient) => {
        return await deleteEmailVerificationTokenQuery(client, token_id);
    });
}

////////////////////////////////
//         INSERTIONS         //
////////////////////////////////

export const createNewUserPerDevice = () => {
    return db1.executeTransaction(async (_client: PoolClient) => {
        return;
    });
}


export const createNewUserWithCredentials = async (userData: CreateUserWithCredentials): Promise<UserDataWithCredentials> => {
    return await db1.executeTransaction(async (client: PoolClient) => {

        const newUser = await insertNewUserQuery(client, userData);

        const passwordRec = await insertNewUserPasswordQuery(client, newUser.id, userData.pass_hash, userData.is_verified);

        if (userData.verification_token)
            await insertNewEmailVerificationToken(client, newUser.id, userData.verification_token);

        return {
            ...newUser,
            passwordRec
        };
    });
}

////////////////////////////////
//           UPDATES          //
////////////////////////////////

/**
 * Deletes user data records from the database. User does not have to be verified.
 * @param userId
 * @returns
 */
export const deleteExistingUserById = async (userId: number): Promise<boolean> => {

    return await db1.executeTransaction(async (client: PoolClient) => {
        try {
            await deleteUserByIdQuery(client, userId);
            return true;
        }
        catch(er)
        {
            return false;
        }
    });
}

/**
 * Updates user verification state in the database.
 * @param userId Primary key to users db.
 * @returns true if query executed successfully
 */
export const updateUserVerificationById = async (userId: number): Promise<boolean> => {

    return await db1.executeTransaction(async (client: PoolClient) => {
        try {
            await updateUserVerificationByIdQuery(client, userId);
            return true;
        }
        catch(er) {
            return false;
        }
    });
}

////////////////////////////////
//           DELETES          //
////////////////////////////////


/**
 * Removes all users active login data from the database. (Basically performs logout of all users)
 * @returns true if query executed successfully
 */
export const deleteAllUsersLoginSessionInfo = async (): Promise<boolean> => {

    return await db1.executeTransaction(async (client: PoolClient) => {
        try {
            await deleteAllRefreshTokensQuery(client);
            await deleteAllFCMTokens(client);
            return true;
        }
        catch(er) {
            return false;
        }
    });
}

export const deleteUserAccountDataByUserId = async (userId: number) : Promise<void> => {
    return db1.executeTransaction( async (client: PoolClient) => {
        await deleteUserAccount(client, userId);
    });
}