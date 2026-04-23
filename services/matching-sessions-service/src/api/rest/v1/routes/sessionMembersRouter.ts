import express, { Router } from "express"
import * as sessionMembersController from "../controllers/sessionMembersController";
import { getUsersAvailabilityValidation } from "../validations/sesMembersRouterValidator";
import { validateRequest } from "../../../../middleware/reqValidationHandler";





export const router = express.Router();


router.post("/availability", getUsersAvailabilityValidation, validateRequest, sessionMembersController.getUsersAvailabilityController);