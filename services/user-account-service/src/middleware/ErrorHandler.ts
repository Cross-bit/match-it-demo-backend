import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/errorCodes";
import logger from "../logger";

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {

    const context = {
        path: req.path,
        method: req.method,
        userUUID: req.userData?.sub,
        requestId: req.headers['x-request-id'] || undefined,
    };

    logger.error("[ErrorHandler] Exception caught", {
        ...context,
        name: err.name,
        message: err.message,
        stack: err.stack
    });

    if (err instanceof AppError) {
        return res.status(err.status).json({
            name: err.code,
            message: err.message,
            status: err.status,
            ...(err as any).errors && { errors: (err as any).errors }
        });
    }

    return res.status(500).json({
        name: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: "Something went wrong.",
        status: 500,
    });
};

export const asyncHandler = (fn: Function) =>
    (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);