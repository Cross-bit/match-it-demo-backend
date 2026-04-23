import {Response, Request, NextFunction} from "express";
import * as DTO from "../services/DTOinterface";
import { checkForFriendRequests, resolvePendingFriendRequest, setPendingFriendRequest } from "../services/friendsCreationService";


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

        if (!result) {
            return res.status(409).send({
                name: "FRIEND_REQUEST_ALREADY_EXISTS",
                message: "Friend request already exists or users are already connected.",
                status: 409
            });
        }

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
