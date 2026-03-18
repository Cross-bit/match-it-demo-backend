import axios, { AxiosInstance } from "axios"
import { SessionType } from "../../interface";
import { SessionMetadata, VotingResult } from "../types";
import logger from "../../logger";
import { env } from "../../config/env";
import { RestaurantRecommenderCBCategoriesMapper } from "./RestaurantRecommenderCBCategoriesMapper";
import { DomainError, SessionMetadataErrorCode } from "../../errors/DomainError";

/**
 * Gateway to our recommendation service API. (Basic non event based solution for now)
 */

export interface NextRecItem<T> {
    itemId: number
    score: number
    cardData: T
}

/** Newly recommended items list DTO */
export interface NewRecommendedDeck<ActivityDataT> {
    /** List of activity items */
    activityItems: Record<string, ActivityDataT[]>,
    nextDeckBundle: NextRecItem<ActivityDataT>[]
}

export interface SessionInfoMemberData {
    userUUID: string
    isCreator: boolean
    metadata?: SessionMetadata
}

export interface CardsData<CardT> {
    sessionType: SessionType
    cards: CardT[]
}

/** Provided information about the matching session for recommendation system. */
interface MatchingSessionInfoDTO {
    /** internal db id of the matching session */
    id: number,
    /** UUID of the matching session */
    sessionUUID: string,
    /** current size of the matching session */
    sessionSize: number,
    sessionType: SessionType,
    members: SessionInfoMemberData[]
}

/** Voting results per users voting deck */
export interface UserDeckVotingResults {
    /** UUID of the user */
    userUUID: string
    votingResult: VotingResult[]
}

/** Updating voting results */
interface RecommendationUpdateDTO {
    session: MatchingSessionInfoDTO,
    usersVotingResults: UserDeckVotingResults[]
}

// === Interface ===

export interface IRecommendationGateway {
    requestNextData<T>(update: RecommendationUpdateDTO): Promise<Record<string, NextRecItem<T>[]>> ;
    requestEndOfRecommendation(update: RecommendationUpdateDTO): Promise<void>;
}

// === Implementation ===

export class RecommendationGateway implements IRecommendationGateway {
    private readonly baseUrl: string;
    private readonly client: AxiosInstance;

    constructor (baseUrl: string, client: AxiosInstance = axios) {
        this.baseUrl = baseUrl;
        this.client = client;
    }

    async requestNextData<T>(update: RecommendationUpdateDTO): Promise<Record<string, NextRecItem<T>[]>> {

        try {
            const session = update.session
            const recsSysUrl = this.getNextEndpoint(session.sessionType);

            logger.info(`[GATEWAY]: Requesting NEXT recommendations for session ${update.session.sessionUUID}`);
            logger.info(`REQUESTING ${recsSysUrl}`)

            const members = await Promise.all(
                session.members.map(userInfo =>
                    this.mapSessionMemberData(session.sessionType, userInfo)
                )
            );

            const reqData = {
                session: {
                    id: session.id,
                    sessionUUID: session.sessionUUID,
                    sessionSize: session.sessionSize,
                    sessionType: session.sessionType,
                    members
                },
                usersVotingResults: update.usersVotingResults.map(v => ({
                    userUUID: v.userUUID,
                    votingResult: v.votingResult
                }))
            }

            const response = await axios.post(
                recsSysUrl,
                reqData,
                {
                    headers: {
                    Authorization: `Bearer ${env.RECSYS_TOKEN}`,
                    "X-Service-Name": env.MATCHING_SESSIONS_SERVICE_IDENTIFIER,
                    }
                }
            );
            return response.data as Record<string, NextRecItem<T>[]>;
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                logger.error(`[GATEWAY ERROR]: Failed to get next recommendations for ${update.session.sessionUUID} - ${err.message}`, {
                    status: err.response?.status,
                    data: err.response?.data,
                });
            } else {
                logger.error(`[GATEWAY ERROR]: Failed to get next recommendations for ${update.session.sessionUUID} - ${String(err)}`);
            }

            logger.error(`Request to get next recommendation data failed! session UUID: ${update.session.sessionUUID}`);
            throw err;
        }
    }

    /** Ensures that session member data (metadata) are correctly mapped according to recommenders requirements. */
    async mapSessionMemberData(sessionType: SessionType, user: SessionInfoMemberData) {
        switch (sessionType) {
            case SessionType.MOVIE: {
                const metadata = user.metadata
                return { userUUID: user.userUUID, isCreator: user.isCreator, metadata };
            }

            case SessionType.RESTAURANT: {
                const metadata = user.metadata
                const selectedCategories = metadata?.sessionParameters?.selectedCategories

                if (!selectedCategories)
                    throw new DomainError(
                        SessionMetadataErrorCode.MISSING_CATEGORIES,
                        "Missing categories for restaurant recommender",
                        { userUUID: user.userUUID }
                    );

                const categoryMapper = new RestaurantRecommenderCBCategoriesMapper()
                const mappedCategories = await categoryMapper.mapFrontendCategoriesToVector(selectedCategories)

                let metadataNew: any = { sensorData: metadata.sensorData }

                logger.info("all", metadata)

                metadataNew["sensorData"] = metadata.sensorData
                metadataNew["sessionParameters"] = metadata.sessionParameters ? {
                    ...user.metadata?.sessionParameters,
                    selectedCategories: mappedCategories
                } : undefined;

                logger.info("sessionParameters:", metadataNew["sessionParameters"])
                logger.info(metadataNew["sessionParameters"])

                const userMapped = {
                    userUUID: user.userUUID,
                    isCreator: user.isCreator,
                    metadata: metadataNew
                }


                return userMapped
            }
            default:
                throw new DomainError(
                    SessionMetadataErrorCode.UNSUPPORTED_SESSION_TYPE,
                    `Session type ${sessionType} is not supported`
                );
        }
    }

    /** Requests recommendation service to terminate recommendations for given session.
     *
     * @param sessionInfo
     */
    async requestEndOfRecommendation(update: RecommendationUpdateDTO): Promise<void> {

        logger.info(`[GATEWAY: REQUESTING END OF RECOMMENDATION]: sessionUUID: ${update.session.sessionUUID}:`);
        const recsSysUrl = this.getEndEndpoint(update.session.sessionType);

        try {
            logger.info(`[GATEWAY]: Requesting END of recommendations for session ${update.session.sessionUUID}`);
            await axios.post(recsSysUrl, update,
                {
                    headers: {
                    Authorization: `Bearer ${env.RECSYS_TOKEN}`,
                    "X-Service-Name": env.MATCHING_SESSIONS_SERVICE_IDENTIFIER,
                    }
                }
            );
            logger.info(`[GATEWAY]: End of recommendation confirmed for session ${update.session.sessionUUID}`);
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                logger.error(
                    `[GATEWAY ERROR]: Failed to end recommendations for ${update.session.sessionUUID} - ${err.message}`,
                    {
                        status: err.response?.status,
                        data: err.response?.data,
                    }
                );
            } else {
                logger.error(
                    `[GATEWAY ERROR]: Failed to end recommendations for ${update.session.sessionUUID} - ${String(err)}`
                );
            }
        }
    }

    /** Requests for recommendation assets data
     *
     * @param sessionInfo
     */
    async requestCardsData<cardT>(cardIds: number[], sessionType: SessionType): Promise<CardsData<cardT>[]> {
        const schemaUrl = this.getAssetsEndpoint();

        logger.info(`[GATEWAY]: Requesting cards data for session of type ${sessionType}, ids ${cardIds}`,
        { cardIds, sessionType });

        try {
            const response = await axios.get(schemaUrl, {
                headers: {
                    Authorization: `Bearer ${env.RECSYS_TOKEN}`,
                    "X-Service-Name": env.MATCHING_SESSIONS_SERVICE_IDENTIFIER,
                },
                params: {
                    cardId: cardIds.join(","), // 1024,1424
                    sessionType: sessionType,  // MOVIE
                },
            }
        );

            logger.info(
                `[GATEWAY]: Cards data received`,
                { status: response.status }
            );

            return response.data as CardsData<cardT>[]

        } catch (err) {
            if (axios.isAxiosError(err)) {
                logger.error(
                    `[GATEWAY ERROR]: Failed to fetch cards data - ${err.message}`,
                    {
                        status: err.response?.status,
                        data: err.response?.data,
                    }
                );
            } else {
                logger.error(
                    `[GATEWAY ERROR]: Failed to fetch cards data - ${String(err)}`
                );
            }

            throw err
        }
    }


    /**
     * Requests schema (feature categories, dimensions etc.) from the recommendation service.
     *
     * @param sessionType - type of session (used to resolve recommender endpoint)
     * @returns recommender schema as JSON
     */
    async requestRecommendationSchema(sessionType: SessionType): Promise<any> {
        const schemaUrl = this.getSchemaEndpoint(sessionType);

        logger.info(`[GATEWAY]: Requesting recommendation schema for session type: ${sessionType}`);

        try {
            const response = await axios.get(schemaUrl,
                {
                    headers: {
                    Authorization: `Bearer ${env.RECSYS_TOKEN}`,
                    "X-Service-Name": env.MATCHING_SESSIONS_SERVICE_IDENTIFIER,
                    }
                }
            );

            logger.info(`[GATEWAY]: Received schema for session type: ${sessionType}`);
            return response.data;
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                logger.error(
                    `[GATEWAY ERROR]: Failed to fetch schema for session type ${sessionType} - ${err.message}`,
                    {
                        status: err.response?.status,
                        data: err.response?.data,
                    }
                );
            } else {
                logger.error(
                    `[GATEWAY ERROR]: Failed to fetch schema for session type ${sessionType} - ${String(err)}`
                );
            }
            throw err;
        }
    }

    /**
     * Requests init session dataset for specific session type.
     *
     * @param sessionType - type of session (used to resolve recommender endpoint)
     * @returns data required by session for initialization
     */
    async requestRecommendationInitData(sessionType: SessionType): Promise<any[]> {
        const initUrl = this.getInitEndpoint(sessionType);

        logger.info(`[GATEWAY]: Requesting recommendation schema for session type: ${sessionType}`);

        try {
            const response = await axios.get(initUrl,
            {
                    headers: {
                    Authorization: `Bearer ${env.RECSYS_TOKEN}`,
                    "X-Service-Name": env.MATCHING_SESSIONS_SERVICE_IDENTIFIER,
                    }
                }

            );
            logger.info(`[GATEWAY]: Received init data for session type: ${sessionType}`);
            return response.data;
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                logger.error(
                    `[GATEWAY ERROR]: Failed to fetch init data for session type ${sessionType} - ${err.message}`,
                    {
                        status: err.response?.status,
                        data: err.response?.data,
                    }
                );
            } else {
                logger.error(
                    `[GATEWAY ERROR]: Failed to fetch schema for session type ${sessionType} - ${String(err)}`
                );
            }
            throw err;
        }
    }

    private getNextEndpoint(type: SessionType): string {
        return `${this.baseUrl}/api/${this.getSessionTypePath(type)}/session/next`;
    }

    private getEndEndpoint(type: SessionType): string {
        return `${this.baseUrl}/api/${this.getSessionTypePath(type)}/session/end`;
    }

    private getInitEndpoint(type: SessionType): string {
        return `${this.baseUrl}/api/${this.getSessionTypePath(type)}/session/initialise`;
    }

    private getAssetsEndpoint(): string {
        return `${this.baseUrl}/api/assets/cards`;
    }

    private getSchemaEndpoint(type: SessionType): string {
        return `${this.baseUrl}/api/${this.getSessionTypePath(type)}/recommender/schema`;
    }

    private getSessionTypePath(type: SessionType): string {
        switch (type) {
        case SessionType.MOVIE: return "movie";
        case SessionType.RESTAURANT: return "restaurant";
        case SessionType.EVENT: return "event";
        case SessionType.SPORT: return "sport";
        default: return "";
        }
    }

}

export const gateway = new RecommendationGateway(env.RECOMMENDATIONS_URL);