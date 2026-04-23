from typing import List

from src.services.recommendations.algorithms.async_algorithm.redistribution_unit import PriorityFunction, RedistributionContext
from src.services.recommendations.restaurant.models.hybrid_model import RestaurantsHybridRecommender
from src.services.recommendations.restaurant.models.group_model import RestaurantGroupModel

class RestaurantRecPriorityFunction(PriorityFunction):

    def __init__(self, group: List[str], model: RestaurantGroupModel, algorithm: RestaurantsHybridRecommender):
        self.algo: RestaurantsHybridRecommender = algorithm
        self.group_model = model

    def get_priority(self, user_id: str, item_id: int, context: RedistributionContext) -> float:
        user_rating = self.algo.score_item(user_id, item_id)
        priority = user_rating * context.get_item_total_votes(item_id)
        return priority

    def get_metadata(self):
        base = super().get_metadata()
        base["algo"] = self.algo.__class__.__name__
        return base