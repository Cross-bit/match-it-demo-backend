import {Response, Request, response, NextFunction} from "express";
import {  } from "../services/friendsQueryService"
import * as DTO from "../services/DTOinterface";
import { checkForFriendRequests, resolvePendingFriendRequest, setPendingFriendRequest } from "../services/friendsCreationService";
import { CLIENT_RENEG_LIMIT } from "tls";


export const admitFriendRequest = async (req: Request, res: Response, next: NextFunction) =>
{
    try {
        const { body } = req;
        const senderUUID = req.userData.sub;
        const requestUUID = body.requestId;

        if (!requestUUID || !senderUUID){
            res.status(424).send({
                name: "FRIEND_CREATION_FAILED",
                message: "Friend request creation failed due to internal error",
                status: 424
            });
        }

        const result = await resolvePendingFriendRequest({ requestUUID } as DTO.AdmitPendingFriendRequest);

        res.send(result);
    }
    catch(e) {
        next(e)
    }
}

/*
Is not important for now

export const rejectFriendRequest = async (req: Request, res: Response) =>
{
    const { body } = req;
    const senderUUID = req.userData.sub;

    const requestUUID = body.requestId;

    if (!requestUUID || !senderUUID){
        res.status(424).send({
            name: "FRIEND_REJECTION_FAILED",
            message: "Friend request rejection failed due to internal error",
            status: 424
        });
    }

    const result = await resolvePendingFriendRequest({ requestUUID } as DTO.AdmitPendingFriendRequest);

    res.send(result);
}
*/

export const sendFriendRequest = async (req: Request, res: Response, next: NextFunction) => {
    try
    {
        const { body } = req;

        const friendUUID = body.userId;

        const senderUUID = req.userData.sub;

        if (!friendUUID || !senderUUID) {
            res.status(424).send({
                name: "FRIEND_REQUST_CREATION_FAILED",
                message: "Friend request creation failed due to internal error",
                status: 424
            });
        }

        const result = await setPendingFriendRequest({
            initiatorId: senderUUID,
            friendId: friendUUID,
        } as DTO.CreatePendingFriendRequest);

        // TODO: it can be null return failed in such a case!!!!

        res.send(result);
    }
    catch(e) {
        next(e)
    }
}


export const checkForPendingRequests = async (req: Request, res: Response, next: NextFunction) =>
{
    try {
        const userUUID = req.userData.sub;

        if (!userUUID){
            res.status(401).send({
                name: "CHECKING_FAILED",
                message: "Friend request check failed due to internal error",
                status: 401
            });
        }

        const result = await checkForFriendRequests(userUUID);
        res.send({requests: result});
    }
    catch(e) {
        next(e)
    }
}
