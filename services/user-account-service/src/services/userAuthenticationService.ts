import * as DTO from './DTOInterface';
import {getUserByEmail} from '../database/usersDatabase'
import bcrypt from "bcrypt"


export const authenticateUserWithCredentials = async (credentials: DTO.UserCredentials): Promise<DTO.AuthenticationResult> =>
{
    const userData = await getUserByEmail(credentials.email)

    if (!userData) {
        return { result: DTO.AuthenticationStatusCode.NOT_EXIST };
    }

    const requireVerification = process.env?.REQUIRE_EMAIL_VERIFICATION ?? 1; // whether we require user to be verified (using e.g. email)

    if (!userData.passwordRec.is_verified && requireVerification == 1) {
        return { result: DTO.AuthenticationStatusCode.NOT_VERIFIED }
    }

    const result = bcrypt.compareSync(credentials.password, userData.passwordRec.password_hash);

    return {
        name: userData.name,
        userId: userData.id,
        result: result ? DTO.AuthenticationStatusCode.OK : DTO.AuthenticationStatusCode.INVALID_PASSWORD,
        userToken: userData.uuid,
        authenticationMethod: userData.authentication_method,
        accessRights: userData.access_rights,
    };
}