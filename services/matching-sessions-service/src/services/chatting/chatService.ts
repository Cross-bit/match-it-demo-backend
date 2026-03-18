import { ChatMessageDTO } from "../../api/rest/v1/controllers/dtos/chat.dto"
import { getMessagesBySession, storeChatMessage } from "../../database/sessionChatDatabase"
import { getAllUsersUUIDSInSession } from "../../database/sessionsManagementDatabase"
import logger from "../../logger"
import { wsDataType } from "../../api/ws/manager/ws.dto"
import { webSocketManager } from "../../api/ws/manager/wsManager"



/**
 * Loads all the messages from the database for particular session and sends them to the client.
 * @param sessionUUID The UUID of the session to replay messages from
 * @param userUUID The UUID of the user that requested the messages
 * @param afterTimestampMs Unix timestamp marking the last received messages by user
 */
export const replaySessionMessages = async (sessionUUID: string, userUUID: string, afterTimestampMs: number) => {

    const afterDatetime = new Date(afterTimestampMs);
    logger.info(` Loading all messages for user-UUID ${userUUID} for session-UUID ${sessionUUID} from timestamp ${afterTimestampMs} which is ${afterDatetime}`, {userUUID, sessionUUID, afterTimestampMs, afterDatetime})
    const allSessionMessages = await getMessagesBySession(sessionUUID, afterDatetime)

    logger.info(`Loaded ${allSessionMessages.length} messages for user-UUID ${userUUID} for session-UUID ${sessionUUID} from timestamp ${afterTimestampMs}`, {userUUID, sessionUUID, afterTimestampMs, allSessionMessages})

    return allSessionMessages.map(md => md.payload as ChatMessageDTO)
}

/**
 * Stores and routes newly incoming session chat messages to all other recipients in the session.
 *
 * @param sessionUUID session UUID the message belongs to
 * @param senderUUID senders UUID
 * @param messageData the payload of the message
 */
export const storeAndRouteIncomingMessage = async (sessionUUID: string, senderUUID: string, messageData: ChatMessageDTO) => {

    // 1) we store the message
    logger.info(`Storing message of user-UUID ${senderUUID} message from session session-UUID ${sessionUUID}`, {sessionUUID, userUUID: senderUUID, messageData})

    await storeChatMessage({
        message_uuid: messageData.messageUuid,
        session_uuid: messageData.sessionUuid,
        user_uuid: messageData.userUuid,
        payload: messageData
    })

    logger.info(`Routing user-UUID ${senderUUID} message to other session-UUID ${sessionUUID} clients`, {sessionUUID, userUUID: senderUUID, messageData})

    // 2) we send it to all recipients
    const memberUUIDs = await getAllUsersUUIDSInSession(sessionUUID)
    const recipients = memberUUIDs.filter(memberUuid => memberUuid != senderUUID) // try to send message to all other members

    logger.info(`routing message-UUID ${messageData.messageUuid} Recipients `, {recipients, sessionUUID, userUUID: senderUUID, messageData})

    webSocketManager.sendReliableMany(
        messageData,
        wsDataType.CHAT_MESSAGE,
        recipients
    )
}
