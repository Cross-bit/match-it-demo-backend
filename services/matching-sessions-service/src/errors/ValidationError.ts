import { AppError } from "./AppError";
import { ErrorCodes } from "./errorCodes";

export type ValidationIssue = {
    field: string;
    code: ValidationCode;
    msg?: string;
    value?: any;
    meta?: Record<string, any>;
};

export class ValidationError extends AppError {
    public readonly errors: ValidationIssue[];

    constructor(validationErrors: ValidationIssue[]) {
    super(ErrorCodes.VALIDATION_ERROR, "Validation error", 400);

    this.errors = validationErrors.map(err => ({
        field: err.field,
        code: err.code,
        msg: err.msg,
        value: err.value,
        meta: err.meta
    }));

        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}


/**
 *  List of all specific validation code for the app
 */
export const enum ValidationCode {
    REQUIRED = "REQUIRED",
    INVALID_FORMAT = "INVALID_FORMAT",
    TOO_SHORT = "TOO_SHORT",
    TOO_LONG = "TOO_LONG",
    OUT_OF_RANGE = "OUT_OF_RANGE",

    INVALID_EMAIL = "INVALID_EMAIL",
    INVALID_UUID = "INVALID_UUID",
    NOT_AN_ARRAY = "NOT_AN_ARRAY",
    ARRAY_TOO_SMALL = "ARRAY_TOO_SMALL",
    ARRAY_TOO_LARGE = "ARRAY_TOO_LARGE",
    INVALID_ENUM_VALUE = "INVALID_ENUM_VALUE",

    WEAK_PASSWORD = "WEAK_PASSWORD",

    FILE_REQUIRED = "FILE_REQUIRED",
    FILE_TOO_LARGE = "FILE_TOO_LARGE",
    UNEXPECTED_FILE_FIELD = "UNEXPECTED_FILE_FIELD",
    IMAGE_TYPE_NOT_ALLOWED = "IMAGE_TYPE_NOT_ALLOWED"
}