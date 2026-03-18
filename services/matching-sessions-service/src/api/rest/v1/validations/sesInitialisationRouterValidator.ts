import { body } from 'express-validator'
import { SessionType } from '../../../../interface';
import { ValidationCode } from '../../../../errors/ValidationError';

export const updateInitialisationValidation = [
    body('sessionUpdate')
        .exists()
        .withMessage({
            code: ValidationCode.REQUIRED,
            msg: 'sessionUpdate is required'
        })
        .isObject()
        .withMessage({
            code: ValidationCode.INVALID_FORMAT,
            msg: 'sessionUpdate must be an object'
        }),

    body('sessionUpdate.sessionUUID')
        .notEmpty()
        .withMessage({
            code: ValidationCode.REQUIRED,
            msg: 'sessionUUID is required'
        })
        .isUUID()
        .withMessage({
            code: ValidationCode.INVALID_UUID,
            msg: 'sessionUUID must be a valid UUID'
        }),

    body('sessionUpdate.votingResult')
        .isArray({ min: 1 })
        .withMessage({
            code: ValidationCode.ARRAY_TOO_SMALL,
            msg: 'votingResult must be a non-empty array',
            meta: { minLength: 1 }
        }),

    body('sessionUpdate.votingResult.*.memberUUID')
        .isUUID()
        .withMessage({
            code: ValidationCode.INVALID_UUID,
            msg: 'memberUUID must be a valid UUID'
        }),

    body('sessionUpdate.votingResult.*.vote')
        .notEmpty()
        .withMessage({
            code: ValidationCode.REQUIRED,
            msg: 'vote is required'
        })
];

export const checkSessionInitializedValidation = [
    body('sessionType')
        .notEmpty()
        .withMessage({
            code: ValidationCode.REQUIRED,
            msg: 'sessionType is required'
        })
        .isIn(Object.values(SessionType))
        .withMessage({
            code: ValidationCode.INVALID_ENUM_VALUE,
            msg: 'sessionType must be a valid SessionType',
            meta: { allowedValues: Object.values(SessionType) }
        })
];