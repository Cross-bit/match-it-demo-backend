import { Request, Response } from "express";
import * as usersService from  "../services/usersPublicProfilesService"


export const getUserProfile = async (req: Request, res: Response) => {
    const { userUUID } = req.params;

    if (!userUUID) {
        return res.status(400).send({
            name: "INVALID_INPUT",
            message: "User UUID must be provided.",
            status: 400
        });
    }

    try {
        const result = await usersService.getUsersProfiles([userUUID]);

        if (!result || result.length === 0) {
            return res.status(404).send({
                name: "USER_NOT_FOUND",
                message: `User with UUID ${userUUID} not found.`,
                status: 404
            });
        }

        return res.send(result[0]);

    } catch (e: any) {
        console.error(e);
        return res.status(500).send({
            name: "FAILED_TO_FETCH_USER",
            message: e.message ?? "Unknown error",
            status: 500
        });
    }
}


export const getUsersBatch = async (req: Request, res: Response) => {

    const { uuids } = req.query;

    const uuidList: string[] = Array.isArray(uuids)
        ? uuids.map(String) // convert parsedQs to string
        : uuids ? [String(uuids)] : [];

    if (uuidList.length === 0) {
        return res.status(400).send({
            name: "INVALID_INPUT",
            message: "Query parameter 'uuids' must contain at least one UUID.",
            status: 400
        });
    }

    try {
        const profiles = await usersService.getUsersProfiles(uuidList);

        return res.send({ profiles });

    } catch (e: any) {
        console.error(e);
        return res.status(500).send({
            name: "FAILED_TO_FETCH_USERS_BATCH",
            message: e.message ?? "Unknown error",
            status: 500
        });
    }
};