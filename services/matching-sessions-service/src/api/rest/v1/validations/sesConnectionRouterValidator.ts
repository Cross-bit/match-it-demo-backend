import { body } from 'express-validator'
import { SessionType } from '../../../../interface';
import { ValidationCode } from '../../../../errors/ValidationError';

export const createNewSessionValidation = [
    body('invitedMemberUUIDs')
        .isArray({ min: 1 })
        .withMessage({
            code: ValidationCode.ARRAY_TOO_SMALL,
            msg: 'invitedMemberUUIDs must be a non-empty array',
            meta: { minLength: 1 }
        }),

    body('invitedMemberUUIDs.*')
        .isUUID()
        .withMessage({
            code: ValidationCode.INVALID_UUID,
            msg: 'Each invitedMemberUUID must be a valid UUID'
        }),

    body('sessionType')
        .notEmpty()
        .withMessage({
            code: ValidationCode.REQUIRED,
            msg: 'sessionType is required'
        })
        .isIn(Object.values(SessionType))
        .withMessage({
            code: ValidationCode.INVALID_ENUM_VALUE,
            msg: 'sessionType must be a valid enum value',
            meta: { allowedValues: Object.values(SessionType) }
        })
];