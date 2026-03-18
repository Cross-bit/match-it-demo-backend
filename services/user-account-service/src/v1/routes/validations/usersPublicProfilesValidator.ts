import { param } from 'express-validator'
import { ValidationCode } from '../../../errors/ValidationError'

export const userUUIDValidation = [
    param('userUUID')
    .notEmpty()
    .withMessage({
        code: ValidationCode.REQUIRED,
        msg: 'User UUID in param is required'
    })
    .isUUID()
    .withMessage({
        code: ValidationCode.INVALID_UUID,
        msg: 'User UUID param must be a valid UUID'
    })
];