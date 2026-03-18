import logger from '../../../logger';
import { WebSocketAuthenticated } from '../websocketsServer';
import { DataWs, wsDataType } from '../manager/ws.dto';
import { handleAck, handleHeartbeat, handleIncomingChatMessage, updateSessionStateAfterVoting } from "../controllers/wsController"
import { IncomingMessage } from 'http';


class WebSocketRouter
{

    routes: Map<wsDataType, (ws: WebSocketAuthenticated, req: any, data: any) => void> = new Map();

    ackedMessages: Set<string> = new Set()

    addRoute = async (type: wsDataType, action: (ws: WebSocketAuthenticated, req: IncomingMessage, data: DataWs) => void): Promise<boolean> => {

        if (this.routes.has(type)) {
            return false;
        }

        this.routes.set(type, action);

        return true;
    }

    /**
     * Tries to parse ws incoming message as text to json object and calls appropriate action.
     * Acts like router for web socket messages. (obviously this could be done more sophisticatly)
     */
    dispatch = async (ws: WebSocketAuthenticated, req: IncomingMessage, parsedMessage: DataWs) => {

        if (!this.routes.has(parsedMessage.type)) {
            logger.error(`Web socket message handler: missing route for payload: ${parsedMessage.type}`);
            return;
        }

        const handlingAction = this.routes.get(parsedMessage.type);

        if (handlingAction)
            handlingAction(ws, req, parsedMessage);

    }
}



export const wsRouter = new WebSocketRouter();

/**************************/
// add new routes here:
/**************************/

// setting up the incoming message routing to the correct handlers
wsRouter.addRoute(wsDataType.VOTING_RESULT, updateSessionStateAfterVoting);
wsRouter.addRoute(wsDataType.CHAT_MESSAGE, handleIncomingChatMessage);

wsRouter.addRoute(wsDataType.HEARTBEAT, handleHeartbeat);
wsRouter.addRoute(wsDataType.ACK, handleAck);
