import * as DTO from './DTOInterface';
import {updateUserFCMToken} from '../database/fcmDatabase'

// NOTE: FCM token is treated as a unique device-session identifier.
// Logging in on another device/account reassigns token ownership and effectively
// invalidates previous device linkage. This is an intentional design decision.

export const handleFCMOnLogin = async (userId: number, fcmToken: string) => {
    await updateUserFCMToken(userId, fcmToken);
}