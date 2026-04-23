import logger from "../logger";
import { getUsersFcmsByUserUUIDs } from "../database/usersDatabase";
import { AvailableState, UsersAvailabilityInfo } from "./types";
import { sessionsCache } from "./session/SessionsCachingService";
import { UserFcmRecordWithUserUUID } from "../database/pg/types/user.db.types";

/**
 * ======================================================
 * DESCRIPTION
 * =======================================================
 * Provides interface to check users availability state.
 * Availability determines whether user can be invited to matching session.
 *
 * checkUsersAvailability - checks complete availability for given list of users
 *
 */

type AvailabilityPredicate = (arg: string) => Promise<AvailableState>;

/**
 * Checks whether users of given Ids are invitable to a session (e.g. when we need to get list of users to invite).
 * @param userUUIDs UUIDs of the users to check the availability.
 */
export const checkUsersAvailability = async (userUUIDs: string[]) : Promise<UsersAvailabilityInfo[]> => {
    let avInfo: UsersAvailabilityInfo[] = [];

    for (const userUUID of userUUIDs) {
        avInfo.push({
                uuid: userUUID,
                state: await checkUserAvailabilityState(userUUID)
            } as UsersAvailabilityInfo
        )
    }

    return avInfo;
}


/**
 * Performs user availability check based on all provided availability predicates.
 * If no predicates provided, checks all. Stops evaluation at first that fails.
 * @param userUUID User uuids to check.
 * @param availablePredicates selected availability predicates
 * @returns Promise on availability state.
 */
export const checkUserAvailabilityState = async (userUUID: string, availablePredicates: AvailabilityPredicate[] | null = null) : Promise<AvailableState> =>
{

    logger.info(`[CHECKING USER AVAILABILITY]: `, { userUUID })
    // user did not provided any ... we perform all checks ...
    if (availablePredicates == null) {
        availablePredicates = allAvailabilityPredicates;
    }

    let result = AvailableState.AVAILABLE;
    for (const predicate of availablePredicates) {
        if((result = await predicate(userUUID)) != AvailableState.AVAILABLE)
            break;
    }

    logger.info(`[AVAILABILITY CHECK RESULT]: `, { result })

    return result;
}

/* ================================================
* Availability predicates:
* =================================================
* Following section defines all possible availability predicates.
* If adding new predicate don't forget to add it to the
* "allAvailabilityPredicates" list at the bottom.
*/

/**
 * Checks whether user is in ongoing matching session. (User can be at most in one matching session)
 * @param userUUID
 * @returns
 */
export const checkUserIsInActiveSession = async (userUUID: string) : Promise<AvailableState> => {

    // !!!! NOTE current getSessionDataByUser is not very optimized for large number of users ... (... worst case is O(number_of_users) ... since every user can be in at most one session... but imagine having this kind of calls 1000s at the same time... RIP service...)
    const res = sessionsCache.getSessionDataByConnectedUserUUID(userUUID) ?  AvailableState.IS_IN_ACTIVE_SESSION : AvailableState.AVAILABLE;
    logger.info(`AVAILABILITY: Checking user ${userUUID} in session, result: `, { result: res })

    return res;
}

/**
 * Checks whether user can be invited physically (his FCM device token must be present in the database)
 * @param userUUID
 * @returns
 */
export const checkUserHasFcmToken = async (userUUID: string) : Promise<AvailableState> => {
    logger.info(`AVAILABILITY: Checking user ${userUUID} has fcm token: `, { result: AvailableState.AVAILABLE })

    try {
        const userFcms: UserFcmRecordWithUserUUID[] = await getUsersFcmsByUserUUIDs([userUUID])

        if (userFcms.length > 0 && userFcms[0].user_uuid == userUUID) // we make rather sure that the query works, just in case ...
            return Promise.resolve(AvailableState.AVAILABLE)
    }
    catch(e) {
        logger.error("An error occured while checking users FCM token availability!", e)
    }

    return AvailableState.IS_OFFLINE;
}

/**
 *
 * Checks whether users device/connection is active and thus user can be invited...
 * @param userUUIDs
 * @returns
 */
export const checkUserIsAlive = async (userUUID: string) : Promise<AvailableState> => {
    // NOTE: liveness probing is currently not implemented (no heartbeat source in this service).
    logger.info(`AVAILABILITY: Checking user ${userUUID} is alive, result: `, { result: AvailableState.AVAILABLE })
    return AvailableState.AVAILABLE;
}

/**
 *
 * Checks users is logged in
 * @param userUUIDs
 * @returns
 */
export const checkUserIsLoggedIn = async (userUUID: string) : Promise<AvailableState> => {
    // NOTE: explicit login-state check is intentionally skipped in this service for now.
    logger.info(`AVAILABILITY: Checking user ${userUUID} is logged in, result: `, { result: AvailableState.AVAILABLE })
    return AvailableState.AVAILABLE;
}


const allAvailabilityPredicates: AvailabilityPredicate[] = [
    checkUserIsInActiveSession,
    checkUserHasFcmToken,
    checkUserIsLoggedIn,
    checkUserIsAlive,
];
