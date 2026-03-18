import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../../errors/AppError";
import { DomainError } from "../../../../errors/DomainError";
import { ErrorCodes } from "../../../../errors/errorCodes";
import { AllChatMessagesDTO } from "./dtos/chat.dto";
import logger from "../../../../logger";
import { replaySessionMessages } from "../../../../services/chatting/chatService";

const log = logger.child({ component: "ChatController" });


export const getSessionChatMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { sub: userUUID } = req.userData
        const sessionUUID = req.params.sessionUUID

        log.info("[ChatController] getSessionChatMessages invoked", {
            requestId: req.requestId,
            userUUID,
            sessionUUID
        });

        const after = req.query.after as string | undefined
        let afterTimestamp = after ? Number(after) : undefined;
        log.info(`[ChatController] Requesting messages after timestamp ${afterTimestamp}`, {afterTimestamp})

        if (!afterTimestamp) {
            afterTimestamp = 0
            log.warn(`[ChatController] After timestamp failed to parse loading all messages instead`, {
                requestId: req.requestId,
                sessionUUID,
                userUUID,
                timestamp: afterTimestamp
            })
        }

        log.info(`[ChatController] Requesting messages after timestamp ${afterTimestamp}`, {
            requestId: req.requestId,
            sessionUUID,
            userUUID,
            timestamp: afterTimestamp
        });

        const messages = await replaySessionMessages(sessionUUID, userUUID, afterTimestamp);

        log.info(`[ChatController] Obtained history messages for session ${sessionUUID}`, {
            requestId: req.requestId,
            sessionUUID,
            userUUID,
            timestamp: afterTimestamp
        });

        res.status(200).json({
            sessionUUID,
            messages
        } satisfies AllChatMessagesDTO)

    }
    catch(e) {
        if (e instanceof DomainError)
            return next(new AppError(ErrorCodes.FETCHING_MESSAGES_FAILED, "Fetching messages for the user failed.", 404));
        next(e)
    }
}
