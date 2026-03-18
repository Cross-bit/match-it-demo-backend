import { EventEmitter, WebSocket } from 'ws';
import logger from '../../../logger';
import crypto from "crypto";
import { handleSessionOnWsReconnectTimeout } from "../../../services/session/sessionWSConnectionErrorHandler"
import { WebSocketAuthenticated } from '../websocketsServer';
import { notifyMembersAboutUserOnlineStatusChanged } from '../../../services/session/sessionManagementService';
import { DataWs, wsDataType } from './ws.dto';

type userUUID = string;

interface DisconnectRecord {
    timestamp: number
    reconnectTimeout?: NodeJS.Timeout
}

interface OutgoingMessageRecord {
    id: string,
    sequence: number,
    message: string,
    lastSendTime: number,
    retryCount: number
}

interface ReliableMessagesState {
    nextSeq: 0, // global sequence number counter for give client
    inFlight: OutgoingMessageRecord|null, // currently sended message
    queue: OutgoingMessageRecord[] // ordered queue of all unprocessed messages sofar
    resendTimer?: NodeJS.Timeout;
}

//private reliable = new Map<userUUID, ReliableState>();


class WebSocketManager {

    // maps public userUUID to their connected websocket
    private wsConnections: Map<userUUID, WebSocketAuthenticated> = new Map();

    public lastDisconnectRecords: Map<userUUID, DisconnectRecord> = new Map();
    public heartBeatTimeOuts: Map<userUUID, NodeJS.Timeout> = new Map();
    public connectionEmitter = new EventEmitter();

    public messageBuffer: string[] = []
    private HEARTBEAT_TIMEOUT = 25_000 // milliseconds
    private MAX_MESSAGE_SIZE = 64_000 // in Bytes
    private MAX_OUTGOING_QUEUE_LEN = 100 // max buffered number of messages per person is MAX_MESSAGE_SIZE * MAX_OUTGOING_QUEUE_LEN (otherwise we drop the message)
    private RELIABLE_RESEND_INTERVAL = 5000
    private MAX_RESEND_COUNT = 20

    // queues for outgoing messages => buffers messages if the connection fails...
    private reliableState = new Map<userUUID, ReliableMessagesState>()

    constructor() {
        setInterval(() => {
            this.pingClients();
        }, 30_000);
    }

    private pingClients() {
        for (const [userUUID, ws] of this.wsConnections.entries()) {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.ping();
            } catch (err) {
                console.warn(`[WS Manager] Ping failed for ${userUUID}`, err);
                ws.terminate();
            this.handleClientsDisconnect(userUUID);
            }
        }
        }
    }

    public async getClientsConnection(userUUID: string): Promise<WebSocketAuthenticated | undefined> {
        return this.wsConnections.get(userUUID);
    }

    public async addClientConnection(userUUID: string, client: WebSocketAuthenticated): Promise<void> {
        logger.info(`[WS: ADDING USER to connection] ${userUUID}`, { uuid: userUUID })

        const existing = this.wsConnections.get(userUUID);
        if (existing) {
            logger.warn(`[WS: USER ALREADY HAS CONNECTION] -> closing old socket for ${userUUID}`);

            try {
                // Make sure to terminate previous websocket connections
                existing.close(1000, "Replaced by new connection")

                // Hard kill with some timeout
                setTimeout(() => {
                    if (existing.readyState !== WebSocket.CLOSED)
                        existing.terminate()
                }, 700)

            } catch (err) {
                logger.error(`[WS] Error terminating old socket:`, err);
            }
        }

        // ---- WAIT until old connection fully dies ----
        setTimeout(() => {
            if (existing)
                this.wsConnections.delete(userUUID);
            client.isAlive = true;
            client.lastHeartbeat = Date.now();
            this.wsConnections.set(userUUID, client);
            this.cancelReconnectTimeout(userUUID) // clear the user reconnect timeout automatically
            this.trySendNextReliable(userUUID)

            logger.info(`[WS: USER CONNECTED OK] ${userUUID}`);
        }, 1000)
    }

    public async handleClientsDisconnect(userUUID: string): Promise<boolean> {
        logger.info("[WS: HANDLE USER DISCONNECT]", { userUUID: userUUID })

        // we give user 60 s to reconnect (this is for a case some external force e.g. proxy closes the connection (ws code: 1006))
        const GRACE_PERIOD_MS = 60_000

        // make sure we removed the record
        if (this.wsConnections.has(userUUID)){
            logger.info(`[WS] User ${userUUID} deleting user record`);
            this.wsConnections.delete(userUUID)
        }
        this.scheduleReconnectTimeout(userUUID, GRACE_PERIOD_MS)
        return true
    }

    private scheduleReconnectTimeout(userUUID: string, gracePeriod: number) {

        if (this.lastDisconnectRecords.has(userUUID)) {
            logger.warn(`[WS] Disconnect already scheduled for ${userUUID}, ignoring duplicate call.`);
            return false;
        }

        this.connectionEmitter.emit("close", userUUID, true);

        logger.info(`[WS] Scheduling possible removal of ${userUUID} in ${gracePeriod / 1000}s`);

        const reconnectTimeout = setTimeout(() => {
            const disconnectRecord = this.lastDisconnectRecords.get(userUUID);
            const lastSeen = disconnectRecord?.timestamp ?? 0;
            const wsStillMissing = !this.wsConnections.has(userUUID);

            const EPSILON_MS = 50;
            logger.info(`[WS] Timeout raised`, {lastSeen, wsStillMissing, timeOutInterval: (Date.now() - lastSeen) })

            if (lastSeen && wsStillMissing && Date.now() - lastSeen >= (gracePeriod - EPSILON_MS)) {
                logger.warn(`[WS] Removing user ${userUUID} after grace period expired`);

                logger.info(`[WS] Timeout raised`, {userUUID, isAwaitingReconnect: false})

                this.clearReliableState(userUUID);
                this.connectionEmitter.emit("close", userUUID, false);
            } else {
                logger.info(`[WS] User ${userUUID} reconnected in time – keeping active`);
                this.connectionEmitter.emit("reconnect", userUUID);
            }

            if (this.lastDisconnectRecords.has(userUUID)){
                logger.info(`[WS] User ${userUUID} deleting timestamp`);
                this.lastDisconnectRecords.delete(userUUID);
            }

        }, gracePeriod);

        this.lastDisconnectRecords.set(userUUID, {reconnectTimeout, timestamp: Date.now()});
    }

    private cancelReconnectTimeout(userUUID: string) {
        if (!this.lastDisconnectRecords.has(userUUID)) // already gone
            return

        const disconnectRecord = this.lastDisconnectRecords.get(userUUID)

        clearTimeout(disconnectRecord?.reconnectTimeout);

        this.lastDisconnectRecords.delete(userUUID)

        logger.info(`[WS] User ${userUUID} reconnected in time - keeping active`);
        this.connectionEmitter.emit("reconnect", userUUID);
    }

    public planNextHeartbeatCheck(senderUUID: string) {
        const previousTimeout = this.heartBeatTimeOuts.get(senderUUID)
        if (previousTimeout) clearTimeout(previousTimeout);
        const newTimeout = setTimeout(() => this.handleHeartbeatTimeout(senderUUID), this.HEARTBEAT_TIMEOUT)
        this.heartBeatTimeOuts.set(senderUUID, newTimeout)
    }

    private handleHeartbeatTimeout(senderUUID: string) {
        const ws = this.wsConnections.get(senderUUID)
        if (!ws) //connection is already gone...
            return

        const lastHeartBeatTimestamp = ws.lastHeartbeat ?? 0
        const diff = Date.now() - lastHeartBeatTimestamp;

        if (diff < this.HEARTBEAT_TIMEOUT) { // protection against race condition
            return;
        }
        ws.terminate();
        webSocketManager.handleClientsDisconnect(senderUUID);
    }

    /**
     * Sends message to a multiple clients.
     * @param userUUID
     * @param message
     * @returns true if success, false if any of the transmissions failed
     */
    public async sendReliableMany(data: any, type: wsDataType, userUUIDs: string[]) {
        let result = true;

        for (const userUUID of userUUIDs) {
            const sendResult = await this.sendReliable(data, type, userUUID);
            result = result && sendResult;
        }

        return result;
    }

    private clearReliableState(userUUID: string) {
        const s = this.reliableState.get(userUUID);
        if (!s) return;

        if (s.resendTimer) clearInterval(s.resendTimer);

        this.reliableState.delete(userUUID);
    }

    private getReliableState(userUUID: string): ReliableMessagesState {
        if (!this.reliableState.has(userUUID)) {
            this.reliableState.set(userUUID, {
                nextSeq: 0,
                inFlight: null,
                queue: []
            });
        }
        return this.reliableState.get(userUUID)!;
    }

    private nextSequence(userUUID: string): number {
        const state = this.getReliableState(userUUID);
        const seq = state.nextSeq;
        state.nextSeq++;
        return seq;
    }

    public handleReliableAck(userUUID: string, ackId: string) {

        const state = this.getReliableState(userUUID);
        const inFlight = state.inFlight;

        // we didn't have a message waiting for ack
        if (!inFlight) {
            logger.warn(`[WS Reliable] ACK ${ackId} for ${userUUID} but no inFlight message`);
            return;
        }

        // if it is correct message
        if (inFlight.id !== ackId) {
            logger.warn(`[WS Reliable] ACK ${ackId} for ${userUUID} does not match inFlight ${inFlight.id} – ignoring`);
            return;
        }

        logger.info(`[WS Reliable] ACK received for ${ackId} (user=${userUUID})`);

        // we can fsree resources
        state.inFlight = null;

        // if queue is empty we can also free timer
        if (state.queue.length === 0) {
            if (state.resendTimer) {
                clearInterval(state.resendTimer);
                state.resendTimer = undefined;
            }
        }

        // generally try send another message
        this.trySendNextReliable(userUUID);
    }

    /**
     * Sends message to a particular client.
     * @returns true if success, false otherwise
     */
    public async sendReliable(data: any, type: wsDataType, userUUID: string) : Promise<boolean> {
        const state = this.getReliableState(userUUID);

        // sequence číslo
        const seq = this.nextSequence(userUUID);
        const sessionId = this.sessionIdFromUserUUID(userUUID)
        const messageId = `${sessionId}-${seq}`;

        const msg: DataWs = {
            sessionId: sessionId,
            messageId,
            sequence: seq,
            requiresAck: true,
            type,
            data
        };

        const record: OutgoingMessageRecord = {
            id: messageId,
            sequence: seq,
            message: JSON.stringify(msg),
            lastSendTime: 0,
            retryCount: 0
        };

        // enqueue message
        state.queue.push(record);

        // try to send next message
        return this.trySendNextReliable(userUUID);
    }

    private sessionIdFromUserUUID(userUUID: string): string {
        return crypto.createHash("sha1")
            .update(userUUID)
            .digest("hex")
            .slice(0, 12);
    }

    public sendUnreliable(data: any, type: wsDataType, userUUID: string) {
        const ws = this.wsConnections.get(userUUID);

        if (!ws || ws.readyState !== WebSocket.OPEN) {
            logger.warn(`[WS Unreliable] Socket closed for ${userUUID}, dropping message`);
            return false;
        }

        const msg: DataWs = {
            sessionId: this.sessionIdFromUserUUID(userUUID),
            requiresAck: false,
            type,
            data
        };

        try {
            ws.send(JSON.stringify(msg));
            logger.info(`[WS SEND unreliable] send message to ${userUUID}`, {message: msg})
            return true;
        } catch (err) {
            logger.error(`[WS Unreliable] Failed to send to ${userUUID}`, err);
            return false;
        }

    }

    private trySendNextReliable(userUUID: string) {

        const ws = this.wsConnections.get(userUUID);
        const state = this.getReliableState(userUUID);

        if (state.inFlight) {
            const msg = state.inFlight;

            if (ws && ws.readyState === WebSocket.OPEN) {
                logger.info(`[WS SEND reliable] send message to ${userUUID}`, {message: msg.message})
                ws?.send(msg.message);
                msg.lastSendTime = Date.now();
            }

            // start timer
            this.startResendTimer(userUUID);
            return true;
        }

        const next = state.queue.shift();
        if (!next) return false;

        try{
            ws?.send(next.message);
            logger.info(`[WS SEND reliable] send message to ${userUUID}`, {message: next.message})

            next.lastSendTime = Date.now();
            state.inFlight = next;
            logger.info(`[WS SEND reliable] stored inflight ${userUUID}`, {message: next.message})

            // start resend loop
            this.startResendTimer(userUUID);

            return true
        }
        catch (e) {
            // unable to send
            logger.info(`[WS SEND reliable] unable to send message to ${userUUID}`, {message: next.message})
            state.queue.unshift(next);
            return false;
        }
    }

    private startResendTimer(userUUID: string) {
        const state = this.getReliableState(userUUID);

        if (state.resendTimer) return;

        state.resendTimer = setInterval(() => {

            const msg = state.inFlight;

            if (!msg) {
                clearInterval(state.resendTimer);
                state.resendTimer = undefined;
                return;
            }

            const now = Date.now();
            if (now - msg.lastSendTime < this.RELIABLE_RESEND_INTERVAL) return;

            if (msg.retryCount >= this.MAX_RESEND_COUNT) {
                console.error(`Reliable delivery failed for ${userUUID}`);
                clearInterval(state.resendTimer);
                state.resendTimer = undefined;
                return;
            }

            // resend
            const ws = this.wsConnections.get(userUUID);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(msg.message);
                msg.retryCount++;
                msg.lastSendTime = now;
            }

        }, this.RELIABLE_RESEND_INTERVAL);
    }
}

export const webSocketManager = new WebSocketManager();

webSocketManager.connectionEmitter.on("close", ( userUUID, awaitingReconnect ) => {
    logger.info(`event raised: ${userUUID} close: ${awaitingReconnect}`, { userUUID })

    if (!awaitingReconnect) // we are not expecting user to reconnect => handle the close
        handleSessionOnWsReconnectTimeout(userUUID);

    // otherwise we can e.g only inform other users that user is offline etc ...
    notifyMembersAboutUserOnlineStatusChanged(userUUID, false)
});


webSocketManager.connectionEmitter.on("reconnect", ( userUUID ) => {
    logger.info(`event raised: ${userUUID} reconnected`, { userUUID })

    // we notify other members that user is back online
    notifyMembersAboutUserOnlineStatusChanged(userUUID, true)
});