import { PoolClient } from "pg";
import { ImageMetadata } from "../services/DTOInterface";
import * as db1 from './dbConnection'
import {
        getUserProfilePictureByUserUUIDQuery,
        deleteUserProfilePictureByUserUUIDQuery,
        insertImageToGalleryQuery,
        insertUserProfilePictureQuery } from "./elementaryQueries/imagesQueries";

export const insertNewUserProfilePicture = async (imageData: ImageMetadata) : Promise<number> => {

    return db1.executeTransaction(async (client: PoolClient) => {
        await deleteUserProfilePictureByUserUUIDQuery(client, imageData.ownerUUID)
        const newImageId = await insertImageToGalleryQuery(client, {
            user_uuid: imageData.ownerUUID,
            server_url: imageData.serverUrl,
            server_path: imageData.serverPath,
            name: imageData.name,
            creation_time: imageData.creationTime.toUTCString()
        });

        return await insertUserProfilePictureQuery(client, newImageId, imageData.ownerUUID)
    });
}

export const getUserProfilePictureByUserUUID = async (userUUID: string) : Promise<ImageMetadata | null> => {
    return db1.executeTransaction(async (client: PoolClient) => {
        const record = await getUserProfilePictureByUserUUIDQuery(client, userUUID);
        if (!record) return null;

        return {
            ownerUUID: record.user_uuid,
            serverUrl: record.server_url,
            serverPath: record.server_path,
            creationTime: new Date(record.creation_time),
            name: record.name,
        }
    });
}