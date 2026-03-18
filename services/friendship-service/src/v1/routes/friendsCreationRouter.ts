import express, { Router } from "express"
import * as friendShipCreationController from "../../controllers/friendShipCreationController";
import { asyncHandler } from "../../middleware/errorHandler";
import { admitFriendRequestValidation, sendFriendRequestValidation } from "./validations/friendsRouterValidations";
import { validateRequest } from "../../middleware/reqValidationHandler";


export const router = express.Router();

// admits pending friend request

router.post("/send", sendFriendRequestValidation, validateRequest, asyncHandler(friendShipCreationController.sendFriendRequest));
router.post("/admit", admitFriendRequestValidation, validateRequest, asyncHandler(friendShipCreationController.admitFriendRequest));
router.get("/check", asyncHandler(friendShipCreationController.checkForPendingRequests))