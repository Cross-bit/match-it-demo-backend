import logger from "../../logger";
import { gateway, RecommendationGateway } from "./RecommendationSystemGateway";



/**
 * Frontend UI defined categories.
 */
export enum RestaurantFrontendCategories {
    VEGETARIAN_ONLY = "VEGETARIAN_ONLY",
    BARS = "BARS",
    BUFFET = "BUFFET",
    CAFES = "CAFES",
    TEAS = "TEAS",
    SWEETS_DESSERTS = "SWEETS_DESSERTS",
    EUROPEAN = "EUROPEAN",
    FAST_FOOD = "FAST_FOOD",
    TAKEAWAY = "TAKEAWAY",
    FINE_DINING = "FINE_DINING",
    LATIN_AMERICAN = "LATIN_AMERICAN",
    MIDDLE_EASTERN = "MIDDLE_EASTERN",
    HEALTHY = "HEALTHY",
    ASIAN = "ASIAN",
    INDIAN = "INDIAN"
}


export class RestaurantRecommenderCBCategoriesMapper {

    constructor(private gatewayClient: RecommendationGateway = gateway) {
        this.gatewayClient = gatewayClient
    }

    // Mapping of frontend checks to the backend recommender categories

    FrontendToRecommenderMapping: Record<RestaurantFrontendCategories, string[]> = {
        [RestaurantFrontendCategories.VEGETARIAN_ONLY]: ["vegetarian_healthy"],
        [RestaurantFrontendCategories.HEALTHY]: ["vegetarian_healthy"],
        [RestaurantFrontendCategories.BARS]: ["bars_alcohol"],
        [RestaurantFrontendCategories.BUFFET]: ["buffet_dining"],
        [RestaurantFrontendCategories.CAFES]: ["cafes"],
        [RestaurantFrontendCategories.TEAS]: ["tea"],
        [RestaurantFrontendCategories.SWEETS_DESSERTS]: ["dessert_sweets"],
        [RestaurantFrontendCategories.EUROPEAN]: ["european"],
        [RestaurantFrontendCategories.FAST_FOOD]: ["fast_food"],
        [RestaurantFrontendCategories.TAKEAWAY]: ["casual_eats"],
        [RestaurantFrontendCategories.FINE_DINING]: ["fine_dining"],
        [RestaurantFrontendCategories.LATIN_AMERICAN]: ["latin_american"],
        [RestaurantFrontendCategories.MIDDLE_EASTERN]: ["middle_eastern"],
        [RestaurantFrontendCategories.INDIAN]: ["south_asian"],
        [RestaurantFrontendCategories.ASIAN]: ["asian"],
    };

    // Returns ordered list of categories recommender service requires

    async load_schema_category_order() : Promise<string[]> {
        const CATEGORY_ORDER = [
            "african",
            "american",
            "asian",
            "bars_alcohol",
            "buffet_dining",
            "cafes",
            "tea",
            "dessert_sweets",
            "european",
            "casual_eats",
            "fast_food",
            "fine_dining",
            "latin_american",
            "middle_eastern",
            "south_asian",
            "vegetarian_healthy",
            "generic_restaurant"
        ]

            return CATEGORY_ORDER // TODO: load this from the recommender schema endpoint this.gatewayClient
        }

    /** Map list of categories (from UI) into one-hot map {category: 0/1} according to loaded schema. */
    async mapFrontendCategoriesToVector(selected: RestaurantFrontendCategories[]) : Promise<Record<string, number>> {

        const schema = await this.load_schema_category_order()
        const map: Record<string, number> = {}

        // Default all zeroes

        schema.forEach(cat => {
            map[cat] = 0
        })

        // Ones if we obtained category from frontend

        selected.forEach(frontendCat => {
            const backendCats = this.FrontendToRecommenderMapping[frontendCat] || []
            backendCats.forEach(backendCat => {
                if (schema.includes(backendCat)) {
                    map[backendCat] = 1
                }
            })
        })

        return map
    }

}