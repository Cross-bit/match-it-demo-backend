import express, {Router} from "express"
import { refreshAccessToken } from "../../controllers/userTokenManagementController"


export const router: Router = express.Router();

router.post("/", refreshAccessToken);