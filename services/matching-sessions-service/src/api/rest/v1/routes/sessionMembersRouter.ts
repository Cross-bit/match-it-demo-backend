import express, { Router } from "express"
import * as sessionMembersController from "../controllers/sessionMembersController";
import { getUsersAvailabilityValidation } from "../validations/sesMembersRouterValidator";
import { validateRequest } from "../../../../middleware/reqValidationHandler";





export const router = express.Router();


/**
 * @openapi
 * /api/v1/availability:
 *   post:
 *     summary: Checks users availability
 *     description: Returns availability information for provided users by their UUIDs.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usersUUIDs:
 *                 type: array
 *                 items:
 *                   type: string
 *             required:
 *               - usersUUIDs
 *     responses:
 *       200:
 *         description: A DTO containing user availability info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 usersInfo:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       uuid:
 *                         type: string
 *                       sessionType:
 *                         type: string
 *                         enum: ["MOVIE", "RESTAURANT"]
 *                       creatorUUID:
 *                         type: string
 *                       state:
 *                         type: string
 *                         enum: ["AVAILABLE", "IS_IN_ACTIVE_SESSION", IS_OFFLINE]
 *                     required:
 *                       - uuid
 *                       - sessionType
 *                       - creatorUUID
 *                       - state
 */
router.post("/availability", getUsersAvailabilityValidation, validateRequest, sessionMembersController.getUsersAvailabilityController);