import logger from "../../logger";
import { webSocketManager } from "../../api/ws/manager/wsManager"
import { MemberData, SessionData } from "./SessionsCachingService";
import * as sessionManagement from "./sessionManagementService"


/**
 *
 * This service is intended to handle websocket connection problems of clients
 * e.g. if the connection gets inexplicably lost we want to kick users from the session etc...
 */


export const handleSessionOnWsReconnectTimeout = async (userUUID: string) => {

    // final ws error handler that disconnects user from the session (reconnect did not happen)
        logger.info(`Handling connection on websocket close ${userUUID}`)

        const sessionData = await sessionManagement.getUserSessionInfo(userUUID);

        logger.info("Session data:", sessionData)
        if (!sessionData) return; // user had no session => no error

        const userSessionData = sessionData.members.find(user => user.uuid == userUUID);

        logger.info("User data:", userSessionData)
        if (!userSessionData) return;

        sessionManagement.disconnectUserFromSession(userSessionData.uuid, sessionData.uuid)
}

export const handleSessionOnWsClose = async (userUUID: string) => {

        const sessionData = await sessionManagement.getUserSessionInfo(userUUID);

        logger.info(`Handling connection on websocket close ${userUUID}`, {userUUID, sessionData})

        if (!sessionData) return; // user had no session => no error

        const userSessionData = sessionData.members.find(user => user.uuid == userUUID);

        if (!userSessionData) return;

        sessionManagement.disconnectUserFromSession(userSessionData.uuid, sessionData.uuid)
}

export const handleOnWsReconnect = async (userUUID: string) => {


        const sessionData = await sessionManagement.getUserSessionInfo(userUUID);

        logger.info(`Handling connection on websocket reconnect ${userUUID}`, {userUUID, sessionData})

        if (!sessionData) return; // user had no session => no error

        const userSessionData = sessionData.members.find(user => user.uuid == userUUID);

        if (!userSessionData) return;

        sessionManagement.disconnectUserFromSession(userSessionData.uuid, sessionData.uuid)
}