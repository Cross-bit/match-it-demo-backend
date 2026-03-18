import { PoolClient } from 'pg';
import { EmailVerificationHash, ImageGalleryRecord, UserData, UserDataWithCredentials, UserPublicProfile } from '../interface'

import logger from "../../logger"
/**
 * Searches for user by user email. (note this probably should be optimized in the future!!! somehow...)
 * @param client
 * @param email
 */
export const searchUserByEmailQuery = async (client: PoolClient, email: string): Promise<UserDataWithCredentials | null> =>
{
    const queryObj = {
        text: `
            SELECT
                users_credentials.*,
                users.*,
                users_credentials.id AS credentials_id
            FROM
                users_credentials
            LEFT JOIN
                users
            ON
                users.id = users_credentials.user_id
            WHERE
                email = $1
            `,
        values: [email]
    }

    const queryRes = await client.query(queryObj);

    if  (queryRes.rowCount == 0)
        return null;

    return {
        id: queryRes.rows[0].user_id,
        uuid: queryRes.rows[0].uuid,
        name: queryRes.rows[0].name,
        email: queryRes.rows[0].email,
        access_rights: queryRes.rows[0].access_rights,
        authentication_method: queryRes.rows[0].authentication_method,
        passwordRec: {
            id: queryRes.rows[0].credentials_id,
            password_hash: queryRes.rows[0].password_hash,
            is_verified: queryRes.rows[0].is_verified
        }
    };
}


/**
 * Searches for user by user email. (note this probably should be optimized in the future!!! somehow...)
 * @param client
 * @param email
 */
export const getUserByUUIDQuery = async (client: PoolClient, uuid: string): Promise<UserData | null> => {
    const queryObj = {
        text: `
            SELECT
            *
            FROM
                users
            WHERE
                uuid = $1
            `,
        values: [uuid]
    }

    const queryRes = await client.query(queryObj);

    if  (queryRes.rowCount == 0)
        return null;

    return queryRes.rows[0];
}

export const getEmailVerificationTokenQuery = async (client: PoolClient, hash: string): Promise<EmailVerificationHash> => {
    const res = await client.query(
        "SELECT * FROM email_verification_tokens WHERE token_hash = $1",
        [hash]
    );

    return res.rows[0];
};

export const deleteEmailVerificationTokenQuery = async (client: PoolClient, token_id: number): Promise<void> => {
    const res = await client.query(
        "DELETE FROM email_verification_tokens WHERE id = $1",
        [token_id]
    );

    return res.rows[0];
};


export const getUserPublicProfilesBatchQuery = async (
    client: PoolClient,
    uuids: string[]
): Promise<UserPublicProfile[]> =>
{
    logger.info("here uuids")
    logger.info(uuids)

    if (uuids.length === 0) return [];

    const query = {
        text: `
            SELECT
                u.uuid AS user_uuid,
                u.name AS user_name,

                g.id AS image_id,
                g.uuid AS image_uuid,
                g.user_uuid AS image_user_uuid,
                g.server_url AS server_url,
                g.server_path AS server_path,
                g.name AS image_name,
                g.creation_time AS image_creation_time

            FROM users u
            LEFT JOIN user_profile_pictures p
                ON p.user_uuid = u.uuid
            LEFT JOIN users_image_gallery g
                ON g.id = p.image_id
            WHERE u.uuid = ANY($1::uuid[])
        `,
        values: [uuids]
    };

    const res = await client.query(query);

    const profiles: UserPublicProfile[] = res.rows.map(row => {
        let profile_picture: ImageGalleryRecord | null = null;

        if (row.image_id) {
            profile_picture = {
                id: row.image_id,
                uuid: row.image_uuid,
                user_uuid: row.image_user_uuid,
                server_url: row.server_url,
                server_path: row.server_path,
                name: row.image_name,
                creation_time: row.image_creation_time
            };
        }

        return {
            uuid: row.user_uuid,
            name: row.user_name,
            profile_picture
        };
    });

    return profiles;
};