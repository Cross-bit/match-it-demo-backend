import * as controller from "../../controllers/userPublicProfilesController";
import express, { Router } from "express";
import { validateRequest } from "../../middleware/reqValidationHandler";
import { userUUIDValidation } from "./validations/usersPublicProfilesValidator";

export const router: Router = express.Router();

/**
 * Management of the user account, that requires user to be logged in.
 */

// GET /users/batch?uuids=1&uuids=2&uuids=3
// Fetch multiple users metadata (batch)
router.get(
    "/batch",
    controller.getUsersBatch
);

// Fetch single user metadata
router.get(
    "/:userUUID",
    userUUIDValidation,
    validateRequest,
    controller.getUserProfile
);
