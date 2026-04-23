import express, { Application } from "express";
import {router as v1friendsCreationRouter} from "./v1/routes/friendsCreationRouter";
import {router as v1friendsManagementRouter} from "./v1/routes/friendsManagementRouter";
import { authenticateToken } from "./middleware/authentication"
import { router as v1peopleRouter } from "./v1/routes/peopleRouter";
import cors from "cors";
import logger from "./logger"
import { errorHandler } from "./middleware/errorHandler";
import swaggerUi from "swagger-ui-express";
const swaggerDoc = require("./v1/docs/swagger.json");

const expressApp: Application = express();

const PORT = +(process.env.PORT || 5500)


///////////////////////////////////
//       Express settings        //
///////////////////////////////////

expressApp.use(cors());
expressApp.use(express.json());
expressApp.use(authenticateToken)
expressApp.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));


///////////////////////////////////
//        Setting routes         //
///////////////////////////////////

expressApp.use("/api/v1/friends", v1friendsManagementRouter);
expressApp.use("/api/v1/friends-requests", v1friendsCreationRouter);
expressApp.use("/api/v1/search", v1peopleRouter);

expressApp.listen(PORT, async () => {
  logger.warn(`⚡️[server]: friendship-manager is running at http://localhost:${PORT}`);
});


expressApp.use(errorHandler)
