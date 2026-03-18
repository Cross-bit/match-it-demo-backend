from typing import List

from src.services.recommendations.algorithms.async_algorithm.redistribution_unit import PriorityFunction, RedistributionContext
from src.services.recommendations.movie.models.cf_model import DiversifiedRecommender
from src.services.recommendations.movie.models.group_model import MovieGroupModel

class MovieRecPriorityFunction(PriorityFunction):

    def __init__(self, group: List[str], model: MovieGroupModel, algorithm: DiversifiedRecommender):
        self.algo: DiversifiedRecommender = algorithm
        self.group_model = model

    def get_priority(self, user_id: str, item_id: int, context: RedistributionContext) -> float:

        user_profile = self.group_model.get_cf_user_profile(user_id)
        user_rating = self.algo.score_item(user_profile, item_id)

        priority = user_rating * context.get_item_total_votes(item_id)
        return priority

    def get_metadata(self):
        base = super().get_metadata()
        base["algo"] = self.algo.__class__.__name__
        return base