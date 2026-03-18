import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import logger from "../logger";


// Extend Express Request typings to include requestId
declare global {
    namespace Express {
            interface Request {
            requestId?: string;
        }
    }
}

export function attachRequestId(req: Request, res: Response, next: NextFunction) {
    const requestId = crypto.randomUUID();
    req.requestId = requestId;

    // Add request ID to the response header
    res.setHeader("X-Request-Id", requestId);

    // Log incoming request with generated ID
    logger.info(`[${requestId}] Incoming request: ${req.method} ${req.originalUrl}`);

    // Log when the response finishes
    res.on("finish", () => {
    logger.info(
        `[${requestId}] Response sent: ${res.statusCode} ${req.method} ${req.originalUrl}`
    );
    });

    next();
}