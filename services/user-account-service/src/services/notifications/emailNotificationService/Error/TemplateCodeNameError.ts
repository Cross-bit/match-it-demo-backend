import { StatusCodes } from 'http-status-codes';
import MailNotificationError from './MailNotificationError';


export default class ConflictError extends  MailNotificationError {
    constructor(message: string = 'Invalid notifi') {
        super(StatusCodes.CONFLICT, message);
        Object.setPrototypeOf(this, ConflictError);
    }
}

