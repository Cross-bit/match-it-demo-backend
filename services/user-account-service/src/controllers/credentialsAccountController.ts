import { createNewUserByCredentials, verifyNewUserEmail, logoutAllUsers } from "../services/userCreationService";
import { generateAccessToken, generateRefreshToken, updateRefreshToken } from "../services/accessTokensManagementService"
import { getUserProfilePictureUrl } from "../services/imageStorage/storeProfilePictureService"
import { authenticateUserWithCredentials } from "../services/userAuthenticationService";
import { NextFunction, Request, Response } from "express";
import { handleFCMOnLogin } from "../services/fcmService";
import * as DTO from "../services/DTOInterface";
import { UserPrivileges } from "../interface";
import logger from "../logger";


/*
    This is the controller for user account creation/authentication using
*/
export const createNewUserAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        logger.info("Creating user account", { action: "createAccountCredentials" });

        const payload = {
            privileges: UserPrivileges.NORMAL,
            ...req.body
        } satisfies DTO.UserCredentialsCreate;

        const result = await createNewUserByCredentials(payload);

        switch(result.status){
            case DTO.UserCreationStatusCode.ALREADY_EXIST:
                return res.status(409).send({
                    name: "ALREADY_EXIST",
                    message: "User with given email already exists",
                    status: 409
                });
            default:
                return res.status(201).send(result);
        }
    } catch (e) {
        next(e);
    }
};

export const loginUserAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, fcmToken } = req.body;

        logger.info("Login in user", { action: "loginUserAccount" });

        const authoRes = await authenticateUserWithCredentials({ email, password });


        if (authoRes.result === DTO.AuthenticationStatusCode.OK) {
            await handleFCMOnLogin(authoRes.userId as number, fcmToken);

            const userUUID = authoRes.userToken as string;

            const authentticationData: DTO.AuthenticationTokenContent = {
                userUUID,
                userEmail: email,
                privilidge: authoRes.accessRights as UserPrivileges,
            };

            const accessToken = generateAccessToken(authentticationData);
            const refreshToken = generateRefreshToken(authentticationData);

            await updateRefreshToken(authoRes.userId as number, refreshToken);

            const profilePictureUrl = await getUserProfilePictureUrl(userUUID);

            return res.status(200).send({
                name: authoRes.name,
                result: authoRes.result,
                uuid: authoRes.userToken,
                accessRights: authoRes.accessRights,
                authenticationMethod: authoRes.authenticationMethod,
                accessToken,
                refreshToken,
                isRefresh: false,
                preferences: { profilePictureUrl },
            } as DTO.AuthenticationResponse);
        }

        switch (authoRes.result) {
        case DTO.AuthenticationStatusCode.NOT_EXIST:
            return res.status(404).send({
                name: "NOT_EXIST",
                message: "Account does not exist",
                status: 404,
            });
        case DTO.AuthenticationStatusCode.INVALID_PASSWORD:
            return res.status(401).send({
                name: "INVALID_PASSWORD",
                message: "Invalid credentials",
                status: 401,
            });
        case DTO.AuthenticationStatusCode.NOT_VERIFIED:
            return res.status(403).send({
                name: "NOT_VERIFIED",
                message: "Account is not verified",
                status: 403,
            });
        case DTO.AuthenticationStatusCode.ALREADY_LOGGED_ID:
            return res.status(409).send({
                name: "ALREADY_LOGGED_IN",
                message: "User already logged in on another device",
                status: 409,
            });
        default:
            return res.status(400).send({
                name: "UNKNOWN_ERROR",
                message: "Login failed for unknown reason",
                status: 400,
            });
        }
    } catch (e) {
        next(e)
    }
}

export const verifyNewUserAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            params: { verificationToken },
        } = req;

        const verificationResult = await verifyNewUserEmail(verificationToken);
        const verificationMessageTitle = verificationResult ? "Match-it verification was successful" : "Match-it verification failed"
        const verificationMessage = verificationResult ? "The verification of your account was successful, now you can login into the application." : "There was some error, please try the registration again later...";

        res.status(200).send(
        `
            <!DOCTYPE html>
            <html>
            <head>
                <title>match-it verification</title>
            </head>
            <body>
                <h1>${verificationMessageTitle}</h1>
                <p>${verificationMessage}</p>
            </body>
            </html>
        `);
    }
    catch(err){
        res.status(500).send(
        `
            <!DOCTYPE html>
            <html>
            <head>
                <title>match-it verification</title>
            </head>
            <body>
                <h1>Something went wrong during authentication, error 500 ...</h1>
            </body>
            </html>
        `);
    }
}

export const logoutAllUsersFromSystem = async (req: Request, res: Response, next: NextFunction) => {
    const {
        params: { adminToken },
    } = req;

    logger.info("[LOGIN OUT ALL USERS]")
    const SUDO_API_KEY = process.env.SUDO_API_KEY

    if (!SUDO_API_KEY) {
        return res.status(500).send({
            name: "INVALID_SUDO_KEY",
            message: "Internal error during sudokey verification.",
            status: 500
        })
    }

    if (!adminToken) {
        return res.status(403).send({
            name: "INVALID_SUDO_KEY",
            message: "You must provide appropriate sudo key to access this API point.",
            status: 403
        })
    }

    if (SUDO_API_KEY != adminToken) {
        return res.status(403).send({
            name: "INVALID_SUDO_KEY",
            message: "Invalid sudo key provided!",
            status: 403
        })
    }

    // once we know it is admin

    try {
        await logoutAllUsers();
        return res.send({ status: "OK" })
    }
    catch(e: any) {
        next(e)
    }
}



// we will have to think through how we will go around this...
export const resetUserPassword = async (req: Request, res: Response, next: NextFunction) =>
{

}
