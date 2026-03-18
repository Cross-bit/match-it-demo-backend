import express, { Application, Request, Response } from "express";
import {router as v1SessionMembersRouter} from "./api/rest/v1/routes/sessionMembersRouter";
import {router as v1SessionConnectionRouter } from "./api/rest/v1/routes/sessionConnectionRouter";
import {router as v1SessionInitRouter } from "./api/rest/v1/routes/sessionInitialisationRouter";
import {router as v1SessionChatRouter } from "./api/rest/v1/routes/sessionChatRouter";
import {router as v1sessionsAssetsRouter} from "./api/rest/v1/routes/sessionsAssetsRouter";
import { authenticateByToken } from './middleware/authentication';
import http, { request } from 'http';
import cors from "cors";
import swaggerUi from 'swagger-ui-express';
import * as swaggerDoc from "./api/rest/v1/docs/swagger.json";
import { ConnectionOkWSDTO, DataWs, ErrorMessageWSDTO } from './api/ws/manager/ws.dto';
import { authenticateWebSocket } from "./api/ws/websocketsServer"
import { WebSocketServer, WebSocket } from 'ws';
import logger from './logger';
import { webSocketManager } from "./api/ws/manager/wsManager";
import { IncomingMessageAuthenticated, WebSocketAuthenticated } from "./api/ws/websocketsServer";
import { wsDataType } from "./api/ws/manager/ws.dto";
import { errorHandler } from "./middleware/errorHandler";
import { handleIncoming } from "./api/ws/connections/messageProtocol";
import { attachRequestId } from "./middleware/reqeustId";

///////////////////////////////////
//       Express settings        //
///////////////////////////////////

const expressApp: Application = express();
export const server = http.createServer(expressApp);

const PORT = +(process.env.PORT || 5500);

// We actually don't need cors.
expressApp.use(cors());

// Set automatic json parsing.
expressApp.use(express.json());

// Set up the swagger docs.
expressApp.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
expressApp.use("/api/v1/assets", v1sessionsAssetsRouter);
// Set the middleware for JWT authentication.
expressApp.use(authenticateByToken);

expressApp.use(attachRequestId);

///////////////////////////////////
//        Setting routes         //
///////////////////////////////////

expressApp.use("/api/v1/chat", v1SessionChatRouter);
expressApp.use("/api/v1/session", v1SessionConnectionRouter);
expressApp.use("/api/v1/users", v1SessionMembersRouter);

expressApp.use("/api/v1/init", v1SessionInitRouter);


server.listen(PORT, async () => {
  logger.warn(`⚡️[server]: matching-sessions-service is running at http://localhost:${PORT}`);
});

// ======================================================================================================

///////////////////////////////////
//       Websocket server        //
///////////////////////////////////

const wss = new WebSocketServer({ server });

wss.on('connection', async (ws: WebSocket, req: IncomingMessageAuthenticated) => {

    const wsAuthenticated: WebSocketAuthenticated = ws;

    // interesting thread about ws implementation state
    // https://stackoverflow.com/questions/4361173/http-headers-in-websockets-client-api
    // article about ws security: https://devcenter.heroku.com/articles/websocket-security

    authenticateWebSocket(req, (err: any) => {
      if (err) {
            ws.send(JSON.stringify({
              type: wsDataType.ERROR_OCCURRED,
              data: {
                  name: "AUTHENTICATION_ERROR",
                  message: err,
                  status: 401
              }
          }));

          logger.warn(`[WS authentication failed]: ${err}`);
          return ws.close();
      }

      logger.info(`[WS authentication succeeded for user ${req.userData?.sub}]`);
    });


    const userUUID = req.userData?.sub;
    logger.info(`[WS on connection]: Connecting user ${userUUID} to websocket`)

    if (!userUUID){
      logger.error("[WS on connection]: userUUID was null, user can't be added to the session!")
      return;
    }

    const existing = await webSocketManager.getClientsConnection(userUUID);
    if (existing) {
      logger.warn(`[WS] Delaying accept of new socket for ${userUUID} (old still closing)`);
      await new Promise(res => setTimeout(res, 500)); // 300–800 ms podle prostředí
    }

    await webSocketManager.addClientConnection(userUUID, wsAuthenticated);

    wsAuthenticated.userUUID = userUUID;
    wsAuthenticated.userData = req.userData;

      ws.on('message', (message: any) => {

          if (message != "{\"type\":\"HEARTBEAT\"}")
            logger.info('[WS Received]:', { message });

          handleIncoming(wsAuthenticated, req, message)
      });

      ws.on('close', (code, reason) => {
        logger.warn(`[WS closing] code=${code}, reason=${reason}`);
        logger.info(`Handling ${userUUID} ws disconnection`);
        webSocketManager.handleClientsDisconnect(userUUID);
      })

      ws.send(JSON.stringify({
        type: wsDataType.CONNECTION_OK,
        data: {
          status: "OK"
        } as ConnectionOkWSDTO
      } as DataWs
    ));
});

// add global error handler
expressApp.use(errorHandler)