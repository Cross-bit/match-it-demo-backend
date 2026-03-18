import { OAuth2Client } from 'google-auth-library'
import logger from '../logger';


const client = new OAuth2Client();


// TESTING ONLY!! move to envs or somewhere else/safe
const WEB_ID = "370238596394-3r2m5qe0qnlv1okfmkotcf45k3m6nkp8.apps.googleusercontent.com";

/**
 * Validates user authentication token
 * @param token Token from the client returned e.g. using googleUser.getAuthResponse().id_token; (or something similar)
 */
export const validateGoogleToken = async (token: string) => {

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: WEB_ID,
    });

    const payload = ticket.getPayload();

    logger.info("Authenticated with google oAutho:", payload);
}
