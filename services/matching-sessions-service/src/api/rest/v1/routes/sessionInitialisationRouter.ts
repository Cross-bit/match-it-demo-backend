import express, { Router } from "express"
import * as sessionManagementController from "../controllers/sessionController";
import { validateRequest } from "../../../../middleware/reqValidationHandler";
import { checkSessionInitializedValidation } from "../validations/sesInitialisationRouterValidator";


export const router = express.Router();

// movies session data
router.post("/movies", sessionManagementController.updateInitMovieResultsController);
router.post("/check", checkSessionInitializedValidation, validateRequest, sessionManagementController.checkSessionInitializedController);
router.get("/movies", sessionManagementController.getInitMovieCards);