import express, { Router } from "express"
import * as peopleSearchController from "../../controllers/peopleSearchController";
import { asyncHandler } from "../../middleware/errorHandler";

/**
 * This is general routing for people
 * e.g. queriing for them in the list etc..
 *
 */

export const router = express.Router();

router.get("/:email", asyncHandler(peopleSearchController.getPersonByEmail));