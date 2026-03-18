import * as DTO from './DTOInterface';
import {updateUserFCMToken} from '../database/fcmDatabase'



// TODO: there is one big problem with making FCM unique attribute in database
// if user decides to connect from others users device, he is not able to
// since the FCM is already in for that device but assigned to different user ... 
// this has to be solved 

export const handleFCMOnLogin = async (userId: number, fcmToken: string) => {
    const recordId = await updateUserFCMToken(userId, fcmToken);
}