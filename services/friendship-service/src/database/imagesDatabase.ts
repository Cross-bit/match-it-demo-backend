import { PoolClient } from "pg";
import * as DTO from "../services/DTOinterface";
import * as db1 from './connection_db1';
import { getUserProfilePictureByUserUUIDsQuery } from "./elementaryQueries/imagesQueries";

//
export const getUserProfilePictureByUserUUIDs = async (userUUID: string[]) : Promise<DTO.ImageMetadata[]> => {
    return db1.executeTransaction(async (client: PoolClient) => {
        const records = await getUserProfilePictureByUserUUIDsQuery(client, userUUID);

        return records.map( record => ({
            ownerUUID: record.user_uuid,
            serverUrl: record.server_url,
            serverPath: record.server_path,
            creationTime: new Date(record.creation_time),
            name: record.name,
        }))
    });
}