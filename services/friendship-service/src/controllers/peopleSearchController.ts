import { NextFunction, Request, Response } from "express"
import { findPersonByEmail } from "../services/friendsQueryService";


export const getPersonByEmail = async (req: Request, res: Response, next: NextFunction) =>
{
    try {
        const senderUUID = req.userData.sub;

        const {
            params: { email },
        } = req;

        if (!senderUUID) {
            res.status(424).send({
                name: "SEARCH_PERSON_BY_EMAIL_FAILED",
                message: "Search person by email failed due to internal error",
                status: 424
            });
        }

        if (!email)
            throw Error("No email provided!!");


        const result = await findPersonByEmail(senderUUID, email);



        if (!result) {
            res.status(404).send({
                name: "NOT_FOUND",
                message: "User with given email not found",
                status: 404,
            });
        }
        else {
            res.status(200).send({person: result});
        }
    }
    catch(e){
        next(e)
    }
}
