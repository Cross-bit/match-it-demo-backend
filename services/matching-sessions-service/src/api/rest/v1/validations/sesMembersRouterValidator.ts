import { body } from 'express-validator'
import { ValidationCode } from '../../../../errors/ValidationError';

export const getUsersAvailabilityValidation = [
    body('usersUUIDs')
        .isArray()
        .withMessage({
            code: ValidationCode.ARRAY_TOO_SMALL,
            msg: 'usersUUIDs must be array'
        }),

    body('usersUUIDs.*')
        .isUUID()
        .withMessage({
            code: ValidationCode.INVALID_UUID,
            msg: 'Each usersUUIDs item must be a valid UUID'
        })
];