import { getPendingRequestsByUserUUID } from "../database/friendsDatabase";
import { UserData, SearchedUserData } from "../database/interface";
import { getAllFriendsByUUID, getUserIdByUUID, searchUserByEmail } from "../database/usersDatabase";
import { getUserProfilePictureByUserUUIDs } from "../database/imagesDatabase";

import logger from "../logger";
import * as DTO from "./DTOinterface";
import path from "path";


export const findPersonByEmail = async (initiatorUUID: string, email: string) : Promise<DTO.SearchedUserData | null>  =>
{
    logger.info("[SEARCHING FOR PERSON BY EMAIL]: searching for person", {email})

    const result: SearchedUserData | null = await searchUserByEmail(initiatorUUID, email);

    // not found or identity => not found
    if (!result || result.uid == initiatorUUID) return null

    const pendingRequests = await getPendingRequestsByUserUUID(result.uid)

    const senderId = await getUserIdByUUID(initiatorUUID)

    if (!senderId) return null

    const pendingRequestFromSender = pendingRequests?.find(req => req.user_id == senderId)

    return {
        uuid: result.uid,
        name: result.name,
        email: result.email,
        isFriend: result.isFriend,
        hasInvitation: pendingRequestFromSender ? true : false
    };
}

export const getAllUsersFriends = async (userUUID: string): Promise<DTO.UserData[]> => {

    logger.info("[FETCHING ALL USERS FRIENDS]:", { userUUID: userUUID})

    const allFriends = await getAllFriendsByUUID(userUUID);

    logger.info("Users friends: ", allFriends)

    if (!allFriends)
        return [] // actually here we should log error... !!!


    const friendsUUIDs = allFriends.map(friend => friend.uid);
    const friendsProfilePics = await getUserProfilePictureByUserUUIDs(friendsUUIDs);
    console.log(friendsProfilePics);

    return allFriends?.map(friend =>
    ({
        uuid: friend.uid,
        name: friend.name,
        email: friend.email,
        profilePicUrl: constructImageUrl(friendsProfilePics.find(friendPic => friendPic.ownerUUID == friend.uid) ?? null)
    }) as DTO.UserData)

}

export const removeUserFriend = async (userUUID: string, friendUUID: string) : Promise<Boolean> => {
    logger.info("[REMOVE USER FRIEND METHOD NOT IMPLEMENTED!!]:")
    return false
/*
    logger.info("[FETCHING ALL USERS FRIENDS]:", { userUUID: userUUID})

    const allFriends = await getAllFriendsByUUID(userUUID);

    logger.info("Users friends: ", allFriends)

    if (!allFriends)
        return [] // actually here we should log error... !!!


    const friendsUUIDs = allFriends.map(friend => friend.uid);
    const friendsProfilePics = await getUserProfilePictureByUserUUIDs(friendsUUIDs);
    console.log(friendsProfilePics);

    return allFriends?.map(friend =>
    ({
        uuid: friend.uid,
        name: friend.name,
        email: friend.email,
        profilePicUrl: constructImageUrl(friendsProfilePics.find(friendPic => friendPic.ownerUUID == friend.uid) ?? null)
    }) as DTO.UserData)
*/
}

/**
 * Creates full image path based on the provided image
 *
 * @param imageData
 * @returns image URL or empty string if couldn't convert the data
 */
export const constructImageUrl = (imageData: DTO.ImageMetadata | null) : string => {

    if (!imageData)
        return ""

    try {
        return path.join(imageData.serverUrl, imageData.serverPath, imageData.name);
    }
    catch(e)
    {
        logger.error("Serious error converting image url", e)
        return ""
    }
}
