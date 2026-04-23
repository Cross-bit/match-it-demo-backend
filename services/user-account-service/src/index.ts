import { Storage } from '@google-cloud/storage';
import express, { Application, Request, Response } from "express";
import {router as v1CredentialsAccountRouter} from "./v1/routes/credentialsAccountRouter";
import {router as v1UserTokenRouter} from "./v1/routes/userTokenRouter";
import {router as v1userAccountRouter} from "./v1/routes/userAccountRouter";
import {router as v1userProfilePreferencesRouter } from "./v1/routes/userProfilePreferencesRouter";
import {router as v1userPublicProfilesRouter} from "./v1/routes/usersPublicProfilesRouter";

import { authenticateToken } from "./middleware/authentication"
import logger from "./logger"
import http from "http"
import cors from "cors";
import path from "path";
import { errorHandler } from './middleware/ErrorHandler';
import swaggerUi from "swagger-ui-express";
const swaggerDoc = require("./v1/docs/swagger.json");

const expressApp: Application = express();

const PORT = +(process.env.PORT || 5500)

expressApp.use(cors());
expressApp.use(express.json());

expressApp.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Authenticated endpoints

expressApp.use("/api/v1/account/", authenticateToken, v1userAccountRouter);
expressApp.use("/api/v1/preferences/", authenticateToken, v1userProfilePreferencesRouter);
expressApp.use("/api/v1/users/", authenticateToken, v1userPublicProfilesRouter);

// Unauthenticated endpoints

expressApp.use("/api/v1/credentials/", v1CredentialsAccountRouter);
expressApp.use("/api/v1/refresh/", v1UserTokenRouter);


const staticFilesPath = path.join(__dirname, '..', 'public');
expressApp.use(express.static(staticFilesPath));

expressApp.post("/", (req: Request, res: Response) => {
  console.log("received data")
  res.status(200).send({})
})

expressApp.use("/api/v1", (req: Request, res: Response) => {
  res.status(404).send({
    name: "INVALID_ROUTE",
    message: "Invalid route",
    status: 404
  });
});

const server = http.createServer(expressApp);


server.listen(PORT, async () => {
  logger.warn(`⚡️[server]: user-account-service is running at http://localhost:${PORT}`)

    if (process.env.IMAGE_UPLOAD_SERVER === "gcs") {
      const storage = new Storage();
      const bucket = storage.bucket('match-it-user-images');
      const file = bucket.file('test.txt');

      // dummy test file
      await file.save('Hello GCS!', {
        resumable: false,
      });
    }
});


expressApp.use(errorHandler)
