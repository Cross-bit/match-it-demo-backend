import {Pool, PoolClient} from "pg"
import { ImageGalleryRecord } from "../interface"
import logger from "../../logger";


export const getUserProfilePictureByUserUUIDsQuery = async (client: PoolClient, userUUID: string[]) : Promise<ImageGalleryRecord[]> =>
{
    const queryObj = {
        text: "SELECT * FROM users_image_gallery AS g LEFT JOIN user_profile_pictures AS p ON p.image_id = g.id WHERE p.user_uuid=ANY($1)",
        values: [userUUID]
    }

    const result = await client.query(queryObj);

    return result.rows;
}