import { param } from 'express-validator'
import { ValidationCode } from '../../../../errors/ValidationError';

export const sessionUUIDParamValidation = [
    param('sessionUUID')
        .notEmpty()
        .withMessage({
            code: ValidationCode.REQUIRED,
            msg: 'sessionUUID is required'
        })
        .isUUID()
        .withMessage({
            code: ValidationCode.INVALID_UUID,
            msg: 'sessionUUID must be a valid UUID'
        })
];