import { WebSocketAuthenticated } from "../websocketsServer";
import { wsRouter } from "../routing/wsMessageRouter";
import { DataWs, wsDataType } from "../manager/ws.dto";
import { IncomingMessage } from "http";
import logger from "../../../logger";

interface ClientState {
    lastProcessedSeq: number;
    pending: Map<number, DataWs>;
}

const clients = new Map<string, ClientState>();

function getState(sessionId: string): ClientState {
    if (!clients.has(sessionId)) {
        clients.set(sessionId, {
            lastProcessedSeq: -1,
            pending: new Map()
        });
    }
    return clients.get(sessionId)!;
}

export function handleIncoming(ws: WebSocketAuthenticated, req: IncomingMessage, raw: string)
{
    let msg: DataWs;

    // SAFE PARSE HERE
    try {
        msg = JSON.parse(raw);
    } catch (e) {
        logger.error("Invalid WS JSON:", e);
        return;
    }

    if (typeof msg.data === "string") {
        try {
            msg.data = JSON.parse(msg.data);
        } catch (e) {
            logger.error("Invalid nested JSON in msg.data:", e, "value:", msg.data);
        }
    }

    const { sessionId, sequence, requiresAck, messageId } = msg;

    // UNRELIABLE MESSAGE -> directly router
    if (!sessionId || sequence == null || !requiresAck) {
        return wsRouter.dispatch(ws, req, msg);
    }

    const state = getState(sessionId);

    // SEND ACK
    if (requiresAck && messageId) {
        ws.send(JSON.stringify({ type: wsDataType.ACK, data: { ackId: messageId }}));
    }

    // DUPLICATE
    if (sequence <= state.lastProcessedSeq) return;


    state.lastProcessedSeq = sequence;
    wsRouter.dispatch(ws, req, msg);
}