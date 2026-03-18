
import { NextFunction, Request, Response } from "express"
import { getAllUsersFriends } from "../services/friendsQueryService";



export const getAllFriends = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userUUID = req.userData.sub;

        const result = await getAllUsersFriends(userUUID)
        console.log(result);
        res.send({
            friends: result
        })
    }
    catch (e) {
        next(e)
    }
}



/**
 * Removes existing friendship. If friendship does not exist does nothing.
 * @param req
 * @param res
 */
export const removeFriend = (req: Request, res: Response, next: NextFunction) =>
{
    try{
        const userUUID = req.userData.sub;

        const {
                params: { recordId },
            } = req;

        //const requestUUID = body.requestId;

        /*if (!requestUUID || !senderUUID){
            res.status(400).send({
                name: "FRIEND_REMOVAL_FAILED",
                message: "Removing friend failed",
                status: 400
            });
        }*/

        res.send({
            result: "OK"
        })
    }
    catch(e) {
        next(e)
    }

}