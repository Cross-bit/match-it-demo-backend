import multer from "multer";
import { ValidationCode, ValidationError } from "../errors/ValidationError";
import { Request, Response, NextFunction } from "express"

export function handleMulterErrors(err: any, req: Request, res: Response, next: NextFunction) {
    if (err instanceof multer.MulterError) {
    // typicky LIMIT_FILE_SIZE, LIMIT_UNEXPECTED_FILE...
    let msg = err.message;

    let codeExternal = ValidationCode.INVALID_FILE
    if (err.code === "LIMIT_FILE_SIZE") {
        msg = "File is too large";
        codeExternal = ValidationCode.FILE_TOO_LARGE
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
        msg = "Unexpected file field";
        codeExternal = ValidationCode.FILE_TYPE_NOT_ALLOWED
    }

    return next(
        new ValidationError([
            {
            field: err.field || "profilePic",
            msg: msg,
            value: null,
            code: codeExternal,
        }
        ]));
    }

    // pokud už je to tvůj ValidationError nebo jiný Error, jen ho pošli dál
    if (err) return next(err);

    next();
}