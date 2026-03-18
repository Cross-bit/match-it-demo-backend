import jwt from "jsonwebtoken"
import { IncomingMessage } from 'http';
import { WebSocket } from 'ws';
import logger from "../../logger";
import { json } from "stream/consumers";

/**
 *  Web socket incoming message with user data from authentication token
*/
export interface IncomingMessageAuthenticated extends IncomingMessage {
    userData?: any;
}

/**
 *  Web socket including user data from authentication token
*/
export interface WebSocketAuthenticated extends WebSocket {
    userUUID?: string;
    userData?: any;
    isAlive?: boolean;
    lastHeartbeat?: number;
    heartbeatTimeout?: NodeJS.Timeout;
}

/**
 * Helper function for jwt websocket authentication (since we are developing for mobile it is easy for us to add custom header field)
 * @param req request data including header fields, sets userData from the parsed token
 * @param errorCallback returns error message
 * @returns void
 */
export const authenticateWebSocket = (req: IncomingMessageAuthenticated, errorCallback: any) => {

    logger.info(`[WS authentication]: Authenticating websocket`)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    logger.info(`[WS authentication header]: `, {payload: JSON.stringify(req.headers), authHeader, token})

    if (token == null) {
        return errorCallback('Missing bearer authentication token');
    }

    const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

    if (!ACCESS_TOKEN_SECRET) {
        return errorCallback('Something went wrong during authentication');
    }

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err:any, user:any) => {
        if (err) {
            return errorCallback('Access token has expired, refresh of the token or relogin is needed');
        }

        // Store user data in the request object
        req.userData = user;
        errorCallback(null);
    });
};