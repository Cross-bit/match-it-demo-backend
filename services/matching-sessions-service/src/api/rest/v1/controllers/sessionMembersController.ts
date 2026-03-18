import { NextFunction, Request, Response } from "express"
import { checkUsersAvailability } from "../../../../services/usersAvailibilityService"
import { UsersAvailabilityInfoDTO } from "./dtos/user.dto";
import logger from "../../../../logger";
import { DomainError } from "../../../../errors/DomainError";
import { AppError } from "../../../../errors/AppError";
import { ErrorCodes } from "../../../../errors/errorCodes";

const log = logger.child({ component: "SessionUsersController" });

export const getUsersAvailabilityController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { usersUUIDs } = req.body;
        const userUUID = req.userData.sub;

        log.info("[SessionUsersController] GetUsersAvailability invoked", {  userUUID, checkedUsers: usersUUIDs})

        const availabilityData = await checkUsersAvailability(usersUUIDs);

        log.info("[SessionUsersController] Obtained users availability", {  userUUID, checkedUsers: usersUUIDs})

        res.send({
            usersInfo: availabilityData
        } as UsersAvailabilityInfoDTO)
    }
    catch(e) {
        if (e instanceof DomainError)
            return next(new AppError(ErrorCodes.USERS_AVAILABILITY_CHECK_FAILED, "Unable to get users availability.", 404));
        next(e)
    }
}
