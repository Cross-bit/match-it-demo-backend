import * as controller from "../../controllers/credentialsAccountController";
import express, { Router } from "express";
import { adminTokenValidation, createUserCredentialsValidation, loginUserValidation, verificationTokenValidation } from "./validations/credentialsAccountValidator";
import { validateRequest } from "../../middleware/reqValidationHandler";

export const router: Router = express.Router();

router.post(
    "/create",
    createUserCredentialsValidation,
    validateRequest,
    controller.createNewUserAccount
);

router.post(
    "/login",
    loginUserValidation,
    validateRequest,
    controller.loginUserAccount
);

router.get(
    "/verify/:verificationToken",
    verificationTokenValidation,
    validateRequest,
    controller.verifyNewUserAccount
);

router.get(
    "/logoutAll/:adminToken",
    adminTokenValidation,
    validateRequest,
    controller.logoutAllUsersFromSystem
);