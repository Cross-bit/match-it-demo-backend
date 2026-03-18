import { PoolClient } from "pg";
import { CreateUser, UserData, CredentialsRecord, CreateEmailVerificationToken} from '../interface';
import CustomDatabaseError, { DbErrorMessage, ForeignKeyViolation, UniqueViolation } from "../Errors/databaseError";
const constants = require("pg-error-constants")
import logger from "../../logger"

////////////////////////////////
//          INSERTS           //
////////////////////////////////

/**
 * Creates new user without any additional credential informations.
 * @param client clients user data to create
 * @param userData
 * @returns
 */
export const insertNewUserQuery = async (client: PoolClient, userData: CreateUser) : Promise<UserData> =>
{
    try {
        const queryObj = {
            text: `INSERT INTO users (email, name, access_rights, authentication_method) VALUES($1, $2, $3, $4) RETURNING *`,
            values: [userData.email, userData.name, userData.access_rights, userData.authentication_method]
        }

        const queryRes = await client.query(queryObj);
        return queryRes.rows[0];

    }
    catch (e: any) {
        logger.error(e)
        if (e.code === constants.UNIQUE_VIOLATION) {
            logger.error("unique got!")
            throw new UniqueViolation();
        }

        if (e.code === constants.FOREIGN_KEY_VIOLATION) {
            throw new ForeignKeyViolation();
        }

        throw new CustomDatabaseError(
            DbErrorMessage.InsertionError,
            e.code,
            e
        );
    }
}

export const insertNewEmailVerificationToken = async (client: PoolClient, user_id: number, tokenData: CreateEmailVerificationToken) : Promise<number> => {

    const queryObj = {
        text: `INSERT INTO email_verification_tokens(user_id, token_hash, expires_at) VALUES($1, $2, $3) RETURNING id`,
        values: [user_id, tokenData.token_hash, tokenData.expires_at]
    }

    const queryRes = await client.query(queryObj);

    return queryRes.rows[0];
}


/**
 * Inserts new password for user
 * @param client
 * @returns
 */
export const insertNewUserPasswordQuery = async (client: PoolClient, userId: number, userPassword: string, is_verified: boolean) : Promise<CredentialsRecord> =>
{
    const queryObj = {
        text: `INSERT INTO users_credentials(user_id, password_hash, is_verified) VALUES($1, $2, $3) RETURNING *`,
        values: [userId, userPassword, is_verified]
    }

    const queryRes = await client.query(queryObj);
    return Promise.resolve(queryRes.rows[0] as CredentialsRecord);
}

////////////////////////////////
//          GETTERS           //
////////////////////////////////

/**
 * Returns all users from the database. TODO: add pagination!!!
 * @param client
 * @returns
 */
export const getAllUsersQuery = async (client: PoolClient) =>
{

    const queryObj = {
        text: `SELECT * FROM users`
    }

    const queryRes = await client.query(queryObj);
    return Promise.resolve(queryRes.rows[0]);
}


/**
 * Returns all users from the database. TODO: add pagination!!!
 * @param client
 * @returns
 */
export const getAllUsersByUserIdQuery = async (client: PoolClient, userID: number) =>
{
    const queryObj = {
        text: `SELECT * FROM users WHERE id = $1`,
        values: [userID]
    }

    const queryRes = await client.query(queryObj);
    return Promise.resolve(queryRes.rows[0]);
}

////////////////////////////////
//          UPDATES           //
////////////////////////////////

/**
 * Returns all users from the database. TODO: add pagination!!!
 * @param client
 * @returns
 */
export const updateUserVerificationByIdQuery = async (client: PoolClient, userId: number) =>
{
    const queryObj = {
        text: 'UPDATE users_credentials SET is_verified = true WHERE user_id = $1',
        values: [userId]
    }

    await client.query(queryObj);
    return Promise.resolve();
}

////////////////////////////////
//          DELETES           //
////////////////////////////////

/**
 * Returns all users from the database. TODO: add pagination!!!
 * @param client
 * @returns
 */
export const deleteUserByIdQuery = async (client: PoolClient, userID: number) =>
{
    const queryObj = {
        text: `DELETE FROM users WHERE id = $1`,
        values: [userID]
    }

    await client.query(queryObj);
    return Promise.resolve();
}