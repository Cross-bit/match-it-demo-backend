import {Pool, PoolClient} from "pg"
import { CreateImageGalleryRecord, ImageGalleryRecord, RefreshTokenRecord } from "../interface"
import logger from "../../logger";



////////////////////////////////
//          INSERTS           //
////////////////////////////////

export const insertUserProfilePictureQuery = async (client: PoolClient, recordId: number, userUUID: string) => {
    const queryObj = {

        text: "INSERT INTO user_profile_pictures (image_id, user_uuid) VALUES($1, $2) RETURNING id",
        values: [recordId, userUUID]
    }

    const result = await client.query(queryObj);

    return result.rows[0].id;
}


export const insertImageToGalleryQuery = async (client: PoolClient, imageData: CreateImageGalleryRecord) => {

    const queryObj = {
        text: "INSERT INTO users_image_gallery (user_uuid, server_url, server_path, name, creation_time) VALUES($1, $2, $3, $4, $5) RETURNING id",
        values: [imageData.user_uuid, imageData.server_url, imageData.server_path, imageData.name, imageData.creation_time]
    }

    const result = await client.query(queryObj);

    return result.rows[0].id;
}

////////////////////////////////
//          UPDATES           //
////////////////////////////////

////////////////////////////////
//          GETTERS           //
////////////////////////////////

export const getUserProfilePictureByRecordUUIDQuery = async (client: PoolClient, userUUID: string) : Promise<ImageGalleryRecord|null> =>
{
    const queryObj = {
        text: "SELECT * FROM users_image_gallery WHERE uuid=$1",
        values: [userUUID]
    }

    const result = await client.query(queryObj);

    if (result.rows.length == 0 || result.rows.length > 1) {
        logger.error(`Invalid number of rows returned from database, expected 1 returned ${result.rows.length}`, result.rows)
        return null;
    }

    return result.rows[0]
}

export const getUserProfilePictureByUserUUIDQuery = async (client: PoolClient, userUUID: string) : Promise<ImageGalleryRecord|null> =>
{
    const queryObj = {
        text: "SELECT * FROM users_image_gallery AS g LEFT JOIN user_profile_pictures AS p ON p.image_id = g.id WHERE p.user_uuid=$1",
        values: [userUUID]
    }

    const result = await client.query(queryObj);

    return result.rows.length == 1 ? result.rows[0] : null;
}

////////////////////////////////
//          DELETES           //
/////////////////////////////////


export const deleteUserProfilePictureByUserUUIDQuery = async (client: PoolClient, userUUID: string) => {
    const queryObj = {

        text: "DELETE FROM user_profile_pictures WHERE user_uuid=$1",
        values: [userUUID]
    }

    await client.query(queryObj);
}

export const deleteUserProfilePictureByRecordIdQuery = async (client: PoolClient, recordId: number) => {
    const queryObj = {

        text: "DELETE FROM user_profile_pictures WHERE id=$1",
        values: [recordId]
    }

    await client.query(queryObj);
}
