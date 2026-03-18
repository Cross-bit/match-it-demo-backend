import * as controller from "../../controllers/usersAccountController";
import express, { Router } from "express";

export const router: Router = express.Router();

/**
 * Management of the user account, that requires user to be logged in
 *
 */

router.delete(
    "/logout",
    controller.logoutUser
);

router.delete(
    "/delete",
    controller.removeUser
);