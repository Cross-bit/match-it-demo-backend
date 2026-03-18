import express, { Router } from "express"
import * as assetsController from "../controllers/sessionAssetsController"
import { asyncHandler } from "../../../../middleware/errorHandler";


export const router = express.Router();

//
// creation
//

// Session creation endpoint
router.get("/cards", asyncHandler(assetsController.getCardsPreviewController));