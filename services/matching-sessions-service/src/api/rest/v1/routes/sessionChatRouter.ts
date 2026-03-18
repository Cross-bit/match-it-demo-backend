import express, { Router } from "express"
import * as sessionChatController from "../controllers/chatController"
import { asyncHandler } from "../../../../middleware/errorHandler";
import { validateRequest } from "../../../../middleware/reqValidationHandler";
import { sessionUUIDParamValidation } from "../validations/commonRouterValidator";


export const router = express.Router();

//
// creation
//

// Session creation endpoint
router.get("/load/:sessionUUID", sessionUUIDParamValidation, validateRequest, asyncHandler(sessionChatController.getSessionChatMessages));