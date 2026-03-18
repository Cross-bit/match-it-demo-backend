import { validationResult } from 'express-validator';
import { ValidationCode, ValidationError, ValidationIssue } from '../errors/ValidationError';
import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

type MsgObj = { code?: ValidationCode; meta?: Record<string, any>; msg?: string };

/**
 * Validation handler middleware for the request params validation
 * (plug int to the route after the validation method)
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
    const result = validationResult(req);

    if (result.isEmpty()) return next();

    // otherwise inspect the error
    const issues = result.array().map((err: any) => {
        const msg = err.msg as string | MsgObj;

        if (msg && typeof msg === "object") {
            return {
                field: err.param,
                code: msg.code ?? ValidationCode.INVALID_FORMAT,
                msg: msg.msg,
                value: err.value,
                meta: msg.meta
            };
        }

        // fallback for wrong format
        return {
            field: err.param,
            code: ValidationCode.INVALID_FORMAT,
            msg: String(msg),
            value: err.value
        };
    });

    return next(new ValidationError(issues));
};