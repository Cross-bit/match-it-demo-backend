import { Request, Response } from "express"
import { regenerateAccessToken } from "../services/accessTokensManagementService"
import logger from "../logger"


/**
 * This controller takes care about refreshing of the user access token
 */
export const refreshAccessToken = async (req: Request, res: Response) => {
    try{
        const refreshToken = req.body?.refreshToken

        if (refreshToken == null)
        {
            res.status(401).send(
            {
                name: "INVALID_REFRESH_TOKEN",
                message: "Something went wrong during authentication",
                status: 401
            })
        }

        const newAccessToken = await regenerateAccessToken(refreshToken);

        logger.info("[NEW USER ACCESS TOKEN ISSUED]:", newAccessToken);

        res.status(200).send({ updatedToken: newAccessToken });

    }
    catch(err)
    {
        logger.error("Refreshing access token failed.");
        res.status(401).send({
            name: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong during authentication",
            status: 401
        })
    }
}