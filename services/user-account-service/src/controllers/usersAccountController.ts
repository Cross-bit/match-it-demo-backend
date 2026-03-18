import { Request, Response } from "express";
import { logoutUserFromSession,removeUserAccount } from "../services/userCreationService"
import logger from "../logger";

/*
    This is the controller for user account management of already existing accounts
*/

export const logoutUser = async (req: Request, res: Response) => {
    const userUUID = req.userData.sub;

    logger.info("Logging out user", { action: "logoutUser", userUUID });
    await logoutUserFromSession(userUUID);
    logger.info("Logged out user", { action: "logoutUser", result: "OK", userUUID });

    res.send({ result: "OK" })
}

/**
 * Removes user account.
 * @param req
 * @param res
 */
export const removeUser = async (req: Request, res: Response) => {
    const userUUID = req.userData.sub;

    logger.info("Removing user account", { action: "removeUser", userUUID });
    await removeUserAccount(userUUID);

    res.send({ result: "OK" })
}

