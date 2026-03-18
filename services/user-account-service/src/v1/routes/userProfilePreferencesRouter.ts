import * as controller from "../../controllers/userPreferencesController";
import express, { Router } from "express";
import { uploadProfilePicture } from "../../services/imageStorage/storeProfilePictureService";
import { handleMulterErrors } from "../../middleware/handleMulterError";

export const router: Router = express.Router();

/**
 * Users public data available to anyone (with an account)
 */

router.post("/profilePic/upload",
    uploadProfilePicture.single('profilePic'),
    handleMulterErrors,
    controller.uploadProfilePicture
);

router.get("/profilePic",
    controller.getUserProfilePicture
);
