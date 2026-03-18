import { IncomingMessage } from "http";
import { WebSocketAuthenticated } from "../websocketsServer";
import * as sessionManagement from "../../../services/session/sessionManagementService";
import { AckDTO, ChatMessageWSDTO, DataWs, ErrorMessageWSDTO, wsDataType } from "../manager/ws.dto";
import { UpdateSessionOptionsDTO } from "../../rest/v1/controllers/dtos/session.dto";
import { SessionUpdateRequestDTO } from "../../rest/v1/controllers/dtos/session.dto";
import logger from "../../../logger";
import { webSocketManager } from "../manager/wsManager";
import { storeAndRouteIncomingMessage } from "../../../services/chatting/chatService";



/**
 * Update on user finished deck of cards
 *
 * @param ws
 * @param req
 * @param data
 */
export const updateSessionStateAfterVoting = async (ws: WebSocketAuthenticated, req: IncomingMessage, wsData: DataWs) =>
{

    const senderUUID = ws.userData.sub;
    try {
        logger.info("[ UPDATE SESSION STATE WS CONTROLLER ]");
        // we simply update the state
        const senderUUID = ws.userData.sub;
        await sessionManagement.handleUserFinishedDeckVoting(senderUUID, wsData.data as SessionUpdateRequestDTO);
    }
    catch(error) {
        webSocketManager.sendReliable({
                name: "SESSION_NEXT_DATA_FAILED",
                message: "Updating voting result failed",
                status: 404
            } as ErrorMessageWSDTO, wsDataType.ERROR_OCCURRED, senderUUID)
    }
}

export const handleHeartbeat = async (ws: WebSocketAuthenticated, req: IncomingMessage, wsData: DataWs) => {
    ws.lastHeartbeat = Date.now();
    ws.isAlive = true;

    const senderUUID = ws.userData.sub;
    webSocketManager.planNextHeartbeatCheck(senderUUID)

    try {
        webSocketManager.sendUnreliable(
        { timestamp: Date.now() },
        wsDataType.HEARTBEAT_PONG,
        senderUUID)

    } catch (err) {
        console.warn(`[WS] Failed to send heartbeat pong`, err);
    }

//    logger.info(`Received WS heartbeat for user UUID ${ws.userUUID} at timestamp ${ws.lastHeartbeat} e.s. ${new Date(ws.lastHeartbeat).toLocaleString()}`)
}

export const handleAck = async (ws: WebSocketAuthenticated, req: IncomingMessage, wsData: DataWs) => {
    ws.lastHeartbeat = Date.now();
    ws.isAlive = true;

    const senderUUID = ws.userData.sub;
    webSocketManager.planNextHeartbeatCheck(senderUUID)

    const ackData = wsData.data as AckDTO;

    try {
        webSocketManager.handleReliableAck(senderUUID, ackData.ackId)
    } catch (err) {
        console.warn(`[WS] Failed to process ack for user ${senderUUID}`, err);
    }
}

export const handleIncomingChatMessage = async (ws: WebSocketAuthenticated, req: IncomingMessage, wsData: DataWs) => {

    // final ws error handler that disconnects user from the session (reconnect did not happen)

    const message = wsData.data as ChatMessageWSDTO;
    const sessionUUID = message.sessionUuid
    const senderUuid = message.userUuid

    await storeAndRouteIncomingMessage(sessionUUID, senderUuid, message)

}
