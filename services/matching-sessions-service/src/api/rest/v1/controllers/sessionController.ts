import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../../errors/AppError";
import { DomainError } from "../../../../errors/DomainError";
import { ErrorCodes } from "../../../../errors/errorCodes";
import logger from "../../../../logger";
import { ensureGroupExists } from "../../../../services/groups/groupManagementService";
import { connectUserToSession,
        createNewSession,
        disconnectUserFromSession,
        getInitMovieSessionData,
        getSessionState,
        getUserHistorySessions,
        inviteMembersToNewSession,
        isSessionInitialized,
        rejectUserSessionConnection,
        startSessionRecommendation,
        terminateSession,
        updateGroupMetadata,
        updateInitMoviesVotingResults
    } from "../../../../services/session/sessionManagementService";
import { SessionsHistoryDTO, SessionStateResponseDTO } from "./dtos/session.dto";
import { SimpleApiResponseDTO } from "./dtos/genera.dto";
import { SessionTerminationReason } from "../../../ws/manager/ws.dto";

const log = logger.child({ component: "SessionController" });

export const connectUserToSessionController = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { sessionUUID } = req.params
        const { sub: userUUID } = req.userData;

        log.info("[SessionController] connectUserToSessionController invoked", {
            userUUID,
            sessionUUID
        });

        await connectUserToSession(userUUID, sessionUUID);

        log.info("[SessionController] User connected successfully", {
            sessionUUID,
            userUUID
        });

        res.status(200).json({
            result: "OK"
        })
    }
    catch(e) {
        if (e instanceof DomainError)
            return next(new AppError(ErrorCodes.CONNECTION_TO_SESSION_FAILED, "User couldn't connect to the matching session.", 404));
        next(e)
    }
}

export const disconnectUserFromSessionController = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { sessionUUID } = req.params
        const userUUID = req.userData.sub;

        log.info("[SessionController] disconnectUserFromSessionController invoked", {
            userUUID,
            sessionUUID
        });

        await disconnectUserFromSession(userUUID, sessionUUID);

        log.info("[SessionController] User disconnected successfully", {
            userUUID,
            sessionUUID
        });

        res.status(200).send({
            result: "OK"
        })
    }
    catch(e){
        if (e instanceof DomainError)
            return next(new AppError(ErrorCodes.CONNECTION_TO_SESSION_FAILED, "User couldn't connect to the matching session.", 404));
        next(e)
    }
}

export const rejectSessionInviteController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { sessionUUID } = req.params;
        const { sub: userUUID } = req.userData;

        log.info("[SessionController] rejectSessionInviteController invoked", {
            userUUID,
            sessionUUID
        });

        await rejectUserSessionConnection(userUUID, sessionUUID);

        log.info("[SessionController] User rejected session invite", {
            userUUID,
            sessionUUID
        });

        res.status(200).send({
            result: "OK"
        })
    }
    catch(e) {
        if (e instanceof DomainError)
            return next(new AppError(ErrorCodes.CONNECTION_TO_SESSION_FAILED, "User couldn't connect to the matching session.", 404));
        next(e)
    }
}

export const createSessionController = async (req: Request, res: Response, next: NextFunction) => {

    const { body } = req;
    const { sub: senderUUID } = req.userData;
    const { invitedMemberUUIDs, sessionType } = body;

    const newSessionData = {
        creatorUUID: senderUUID,
        invitedMemberUUIDs,
        sessionType: sessionType
    };

    log.info("[SessionController] createSessionController invoked", {
        senderUUID,
        invitedCount: invitedMemberUUIDs?.length ?? 0,
        invitedMemberUUIDs: invitedMemberUUIDs,
        sessionType
    });

    try {
        const newSession = await createNewSession(newSessionData);

        log.info("[SessionController] Session created successfully", {
            sessionUUID: newSession.uuid,
            senderUUID
        });

        // we assign group (based on the members UUIDs) the the newly created session
        const members = newSession.members.map(m => m.uuid)
        const groupMetadata = await ensureGroupExists(members);

        if (!groupMetadata) {
            return next(new AppError(ErrorCodes.GROUP_META_INITIALIZATION_FAILED, "Session creation failed, group metadata not initialized.", 404));
        }

        // Adds new group metadata
        await updateGroupMetadata(newSession.uuid, groupMetadata)

        log.info("[SessionController] Group metadata initialized", {
            sessionUUID: newSession.uuid,
            groupMeta: groupMetadata,
            senderUUID
        });

        inviteMembersToNewSession(newSession.uuid)

        return res.status(200).send({
            sessionUUID: newSession.uuid,
        })
    }
    catch (e) {
        if (e instanceof DomainError)
            return next(new AppError(ErrorCodes.SESSION_CREATION_FAILED, "Session creation failed.", 404));
        next(e)
    }
}

export const getUserHistorySessionsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { sub: userUUID } = req.userData;

        log.info("[SessionController] getUserHistorySessionsController invoked", {
            requestId: req.requestId,
            userUUID
        });

        const userHistorySessions = await getUserHistorySessions(userUUID);

        log.info("[SessionController] User history sessions fetched", {
            requestId: req.requestId,
            userUUID
        });

        res.status(200).send({
            sessions: userHistorySessions
        } satisfies SessionsHistoryDTO)
    }
    catch(e) {
        next(e)
    }
}


export const startSessionController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creatorUUID = req.userData.sub;
        const { sessionUUID } = req.params

        log.info("[SessionController] StartSession invoked", {
            requestId: req.requestId,
            creatorUUID,
            sessionUUID
        });

        await startSessionRecommendation(creatorUUID, sessionUUID);

        log.info("[SessionController] Session successfully started", {
            requestId: req.requestId,
            senderUUID: creatorUUID,
            sessionUUID
        });

        return res.status(200).send({
            result: "OK"
        } satisfies SimpleApiResponseDTO)
    }
    catch(e) {
        if (e instanceof DomainError)
            return next(new AppError(ErrorCodes.SESSION_START_FAILED, "Session start failed.", 404));
        next(e)
    }
}

export const checkSessionStateController = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const userUUID = req.userData.sub;
        const { sessionUUID } = req.params

        log.info("[SessionController] CheckSessionState invoked", {
            requestId: req.requestId,
            userUUID,
            sessionUUID
        });

        const sessionState = await getSessionState(sessionUUID);

        log.info("[SessionController] Obtained session state", {
            requestId: req.requestId,
            userUUID,
            sessionUUID,
            sessionState
        });

        res.status(200).send({
            state: sessionState
        } satisfies SessionStateResponseDTO)
    }
    catch(e) {
        if (e instanceof DomainError)
            return next(new AppError(ErrorCodes.CHECKING_SESSION_STATE_FAILED, "Session check failed.", 404));
        next(e)
    }
}

export const terminateSessionController = async (req: Request, res: Response, next: NextFunction) => {

    const { userUUID } = req.params
    const { sessionUUID } = req.params

    log.info("[SessionController] TerminateSession invoked", {
        requestId: req.requestId,
        userUUID,
        sessionUUID
    });

    try {
        const terminationRes = await terminateSession(sessionUUID, SessionTerminationReason.EXPLICIT);

        log.info("[SessionController] Session termination result", {
            requestId: req.requestId,
            userUUID,
            sessionUUID,
            terminationRes
        });

        return res.status(200).send({ result: terminationRes ? "OK" : "NOK" })
    }
    catch(e) {
        if (e instanceof DomainError)
            return next(new AppError(ErrorCodes.SESSION_TERMINATION_FAILED, "Session termination failed.", 409))
        next(e)
    }
}

export const checkSessionInitializedController = async (req: Request, res: Response, next: NextFunction) => {
    const userUUID = req.userData.sub;
    const { sessionType } = req.body;

    log.info("[SessionController] CheckUserHasSessionHistoryData invoked", {
        requestId: req.requestId,
        userUUID,
        sessionType
    });

    try {
        const initCheckRes = await isSessionInitialized(userUUID, sessionType);

        log.info("[SessionController] Session initialization result", {
            requestId: req.requestId,
            userUUID,
            result: initCheckRes
        });

        return res.status(200).send({ result: initCheckRes ? "OK" : "NOK" })
    } catch(e) {
        if (e instanceof DomainError)
            return next(new AppError(ErrorCodes.SESSION_INIT_CHECK_FAILED, "Session history data check failed.", 409 ))
        next(e)
    }
}

export const getInitMovieCards = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userUUID = req.userData.sub;

        log.info("[SessionController] getInitMovieCards invoked", {
            requestId: req.requestId,
            userUUID
        });

        const r = await getInitMovieSessionData()
        log.info("[SessionController] movies init data", {
            initData: r
        });

        return res.status(200).send({ movies: r})
    }
    catch(e) {
        next(e)
    }
}


export const updateInitMovieResultsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { body: sessionUpdate } = req;
        const userUUID = req.userData.sub;

        log.info("[SessionController] UpdateInitMovieResults invoked", {
            requestId: req.requestId,
            userUUID,
            sessionUpdate
        });

        await updateInitMoviesVotingResults(userUUID, sessionUpdate);

        return res.status(200).send({
            result: "OK"
        } satisfies SimpleApiResponseDTO)
    } catch(e) {
        if (e instanceof DomainError)
            return next(new AppError(ErrorCodes.SESSION_INIT_DATA_UPDATE_FAILED, "Updating init movie session data failed.", 400))
        next(e)
    }
}
