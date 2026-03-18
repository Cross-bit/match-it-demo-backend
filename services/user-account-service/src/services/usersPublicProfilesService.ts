import { dataproc } from "googleapis/build/src/apis/dataproc";
import { UserProfileDto } from "../controllers/dtos/users.dto";
import { getPulicUsersProfilesByUUIDs } from "../database/usersDatabase";
import { ImageMetadata } from "./DTOInterface";
import { constructImageUrl } from "./imageStorage/imageStoreUtils";




export const getUsersProfiles = async (
    usersUUIDs: string[]
): Promise<UserProfileDto[] | null> => {

    const userProfileData = await getPulicUsersProfilesByUUIDs(usersUUIDs);

    if (!userProfileData) return null;

    const profiles = await Promise.all(
        userProfileData.map(async data => {

            let avatarUrl: string | null = null;

            if (data.profile_picture) {
                avatarUrl = await constructImageUrl({
                    ownerUUID: data.uuid,
                    serverUrl: data.profile_picture.server_url,
                    serverPath: data.profile_picture.server_path,
                    creationTime: new Date(data.profile_picture.creation_time),
                    name: data.profile_picture.name,
                } satisfies ImageMetadata);
            }

            return {
                uuid: data.uuid,
                name: data.name,
                avatarUrl
            } satisfies UserProfileDto;
        })
    );

    return profiles;
};