import { body } from 'express-validator'

export const sendFriendRequestValidation = [
    body('userId').notEmpty().withMessage("The id of the  userId can't be empty.")
];

export const admitFriendRequestValidation = [
    body('requestId').notEmpty().withMessage("The id of the request requestId can't be empty.")
];