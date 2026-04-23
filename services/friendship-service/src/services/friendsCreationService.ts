
import { tryResolvePendingRequest, createNewPendingRequest as createNewPendingRequest, getAllPendingUsersByUserUUID as GetAllPendingFriendsByUserId, checkFriendshipByUUID } from "../database/friendsDatabase";
import { NewFriendship, PendingFriendshipWithFrineData } from "../database/interface";
import { getUserById, getUserFcmDataByUUIDs } from "../database/usersDatabase";
import { sendFCMDataMessage } from "./FCM/fcmNotifications"
import * as DTO from "./DTOinterface"
import { DataFCM, NewFriendRequestNotificationFCM, dataFCMType } from "./FCM/interface";
import logger from "../logger";

const log = logger.child({ service: "friendshipCreation" });

export const setPendingFriendRequest = async (request: DTO.CreatePendingFriendRequest) : Promise<DTO.NewPendingRequestResponse | null> =>
{
    log.info("[FRIENDSHIP SERVICE]: creating pending friend request")

    const alreadyExistingFriendship = await checkFriendshipByUUID(request.initiatorId, request.friendId)

    if (alreadyExistingFriendship) {
        return null;
    }

    const pendingFriendship = await createNewPendingRequest(request.initiatorId, request.friendId);

    if (!pendingFriendship) {
        return null;
    }

    sendPendingRequestNotification(request.friendId);

    log.info("[FRIENDSHIP SERVICE]: pending friend request created")
    return {
        requestId: pendingFriendship.uuid,
        creationTime: pendingFriendship.creation_time
    } as DTO.NewPendingRequestResponse;
}

const sendPendingRequestNotification = async (friendUUID: string) => {

    log.info("[FRIENDSHIP SERVICE]: sending pending request notification")

    const friendsFCMs = await getUserFcmDataByUUIDs([friendUUID]);

    if (friendsFCMs.length > 0) {
        sendFCMDataMessage({
            type: dataFCMType.FRIEND_REQUEST_NOTIFICATION,
            data: {
                friendUUID,
                friendName: friendsFCMs[0].name
            } as NewFriendRequestNotificationFCM
        } as DataFCM,
        [friendsFCMs[0].fcm_token]
        )

        log.info("[FRIENDSHIP SERVICE]: pending request notification send")
    }
    else
    {
        log.warn("[FRIENDSHIP SERVICE]: pending request notification skipped, recipient has no FCM token", {
            friendUUID
        });
    }
}


export const resolvePendingFriendRequest = async (request: DTO.AdmitPendingFriendRequest) : Promise<DTO.NewFriendshipResponse> =>
{

    log.info("[FRIENDSHIP SERVICE]: sending pending request notification")

    const resolvedReq = await tryResolvePendingRequest(request.requestUUID);

    if (!resolvedReq) {
        log.error("Resolving friendship failed.");
        throw new Error("Fatal error while resolving friendship!");
    }

    // NOTE: this currently uses two reads for clarity; can be optimized into a single query later.
    const initiatorData = await getUserById(resolvedReq.user_id);
    const friendData = await getUserById(resolvedReq.friend_id);

    log.info("[FRIENDSHIP SERVICE]: pending request notification send")

    if (!friendData)
    {
        throw new Error("Friend data does not exist in the database!! Fatal error while creating relationship!!");
    }

    if (!initiatorData) {

        throw new Error("Initiator data does not exist in the database!! Fatal error while creating relationship!!");
    }


    return {
        friendshipId: resolvedReq.uuid,
        friendData: {
            uuid: initiatorData.uid,
            name: initiatorData.name,
            email: initiatorData.email,
            profilePicUrl: ""
        },
        creationTime: resolvedReq.creation_time
    };
}


export const checkForFriendRequests = async (userUUID: string) : Promise<DTO.PendingRequestQueryResponse[]> =>
{

    log.info("[FRIENDSHIP SERVICE]: checking for pending pending requests", { userUUID: userUUID })

    const pendingFriendships = await GetAllPendingFriendsByUserId(userUUID);

    if (!pendingFriendships){
        log.error("[FRIENDSHIP SERVICE]: failed to fetch pending requests", { userUUID });
        return [];
    }

    const noIdentity = pendingFriendships.filter(m => m.friend_data.uid !== userUUID)

    log.info("[FRIENDSHIP SERVICE]: returning list of pending friend requests", { userUUID: userUUID, requests: noIdentity })
    logger.info("here mf", pendingFriendships)
    return noIdentity.map( data => ({
        requestId: data.uuid,
        friendData: {
            uuid: data.friend_data.uid,
            name: data.friend_data.name,
            email: data.friend_data.email
        }
    } as DTO.PendingRequestQueryResponse))
}