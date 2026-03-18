import express, { Router } from "express"
import * as sessionManagementController from "../controllers/sessionController"
import { asyncHandler } from "../../../../middleware/errorHandler";
import { sessionUUIDParamValidation } from "../validations/commonRouterValidator";
import { validateRequest } from "../../../../middleware/reqValidationHandler";
import { createNewSessionValidation } from "../validations/sesConnectionRouterValidator";


export const router = express.Router();

//
// creation
//

// Session creation endpoint
router.post("/create", createNewSessionValidation, validateRequest, asyncHandler(sessionManagementController.createSessionController));

// Creator starts the session previously created
router.post("/start/:sessionUUID", sessionUUIDParamValidation, validateRequest, asyncHandler(sessionManagementController.startSessionController));

// Session termination endpoint
router.post("/terminate/:sessionUUID", sessionUUIDParamValidation, validateRequest, asyncHandler(sessionManagementController.terminateSessionController));

router.get("/sessionState/:sessionUUID", sessionUUIDParamValidation, validateRequest, asyncHandler(sessionManagementController.checkSessionStateController));

//
// connection
//

// User session connection endpoint (user accepts the invite)
router.post("/connect/:sessionUUID", sessionUUIDParamValidation, validateRequest, asyncHandler(sessionManagementController.connectUserToSessionController));

// User session connection endpoint (user accepts the invite)
router.post("/disconnect/:sessionUUID", sessionUUIDParamValidation, validateRequest, asyncHandler(sessionManagementController.disconnectUserFromSessionController));

// user rejects session invite
router.post("/reject/:sessionUUID", sessionUUIDParamValidation, validateRequest, asyncHandler(sessionManagementController.rejectSessionInviteController));

//
// other
//

router.get("/history", asyncHandler(sessionManagementController.getUserHistorySessionsController));

