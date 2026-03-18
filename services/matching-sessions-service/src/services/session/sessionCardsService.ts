import { CardsDataDTO } from "../../api/rest/v1/controllers/dtos/assets.dto"
import { SessionType } from "../../interface"
import { gateway as recommendationsGateway } from "../RecommendationServices/RecommendationSystemGateway"

/**
 * Aggregates cards data by ids for a given session.
 * Generic type is intentionally omitted here.
 */
export const getCardsDataForSession = async (ids: number[], sessionType: SessionType) : Promise<CardsDataDTO<any>[]> => {
    return await recommendationsGateway.requestCardsData<any>(ids, sessionType)
}