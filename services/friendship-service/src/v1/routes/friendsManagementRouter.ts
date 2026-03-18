import express, { Router } from "express"
import * as friendsManagementController from "../../controllers/friendsManagementController";
import { asyncHandler } from "../../middleware/errorHandler";


export const router = express.Router();


// admits pending friend request

router.get("/", asyncHandler(friendsManagementController.getAllFriends));

router.delete("/", asyncHandler(friendsManagementController.removeFriend));
