import { body, param } from 'express-validator'
import zxcvbn from 'zxcvbn'
import { ValidationCode } from '../../../errors/ValidationError'
import { env } from '../../../config/env'


export const createUserCredentialsValidation = [
    body('name')
    .trim()
    .notEmpty()
    .withMessage({
        code: ValidationCode.REQUIRED,
        msg: 'Name is required'
    })
    .isLength({ min: 2, max: 50 })
    .withMessage({
        code: ValidationCode.OUT_OF_RANGE,
        msg: 'Name must be between 2 and 50 characters',
        meta: { min: 2, max: 50 }
    }),

    body('email')
    .trim()
    .notEmpty()
    .withMessage({
        code: ValidationCode.REQUIRED,
        msg: 'Email is required'
    })
    .isEmail()
    .withMessage({
        code: ValidationCode.INVALID_EMAIL,
        msg: 'Email must be a valid email address'
    }),

    body('password')
    .notEmpty()
    .withMessage({
        code: ValidationCode.REQUIRED,
        msg: 'Password is required'
    })
    .isLength({ min: 8 })
    .withMessage({
        code: ValidationCode.TOO_SHORT,
        msg: 'Password must be at least 8 characters long',
        meta: { min: 8 }
    })
    .custom((value: string) => {
        const result = zxcvbn(value);
        if (result.score < env.MINIMAL_PASSWORD_STRENGTH_LVL) {
        throw {
            code: ValidationCode.WEAK_PASSWORD,
            msg: 'Password is too weak',
            meta: { minScore: env.MINIMAL_PASSWORD_STRENGTH_LVL, score: result.score }
        };
        }
        return true;
    })
];

export const loginUserValidation = [
    body('email')
    .trim()
    .notEmpty()
    .withMessage({
        code: ValidationCode.REQUIRED,
        msg: 'Email is required'
    })
    .isEmail()
    .withMessage({
        code: ValidationCode.INVALID_EMAIL,
        msg: 'Email must be a valid email address'
    }),

    body('password')
    .notEmpty()
    .withMessage({
        code: ValidationCode.REQUIRED,
        msg: 'Password is required'
    }),

    body('fcmToken')
    .optional()
    .isString()
    .withMessage({
        code: ValidationCode.INVALID_FORMAT,
        msg: 'FCM token must be a string'
    })
];

export const verificationTokenValidation = [
    param('verificationToken')
    .notEmpty()
    .withMessage({
        code: ValidationCode.REQUIRED,
        msg: 'Verification token is required'
    })
];

export const adminTokenValidation = [
    param('adminToken')
    .notEmpty()
    .withMessage({
        code: ValidationCode.REQUIRED,
        msg: 'Admin token is required'
    })
];