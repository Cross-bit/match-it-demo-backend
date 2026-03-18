import os
import logging
from typing import Dict, List, Tuple
from src.services.recommendations.algorithms.async_algorithm.models import Vote
from src.services.recommendations.algorithms.async_algorithm.redistribution_unit import PriorityFunction, RedistributionContext, RedistributionUnit
from src.services.recommendations.algorithms.async_algorithm.threshold_policy import ThresholdPolicy
from src.services.recommendations.restaurant.models.hybrid_model import RestaurantsHybridRecommender
from src.services.recommendations.restaurant.models.group_model import RestaurantGroupModel

class AsyncGroupRestaurantRecommender :

    def __init__(self, users_ids: List[int],
                single_user_recommender: RestaurantsHybridRecommender,
                group_model: RestaurantGroupModel,
                redistribution_unit: RedistributionUnit,
                threshold_policy: ThresholdPolicy,
                window_size: int):

        self.group_model = group_model
        self.single_user_recommender = single_user_recommender

        self.redistribution_unit = redistribution_unit
        self.threshold_policy = threshold_policy

        self.current_round = 0
        self.window_size = window_size
        self.users_ids = users_ids

        if (len(users_ids) != len(set(users_ids))):
            raise ValueError("Duplicate user UUIDs found!")


    def update_on_group_size_changed(self, new_users_ids: List[str]) -> None:
        self.users_ids = [m.userUUID for m in new_users_ids]

    def get_next_round_recommendation(self, previous_round_votes: Dict[str, List[Vote]], exclude_items: List[int]) -> Dict[str, List[Tuple[int, float]]]:
        """ Updates the internal state based on user votes from previous rounds
            and returns a new list of recommended items for each user.
            Args:
                users_votes (Dict[str, List[Item]]): Users votes from the last round.
            Returns:
                List[int]: New list of recommendations for each user.
        """
        logging.info("from async!!")
        next_round_recs: Dict[str, List[Vote]] = {}

        if self.current_round == 1:
            per_user_unique_votes = self._filter_only_unique_items(previous_round_votes)
            self.redistribution_unit.update_voted_items(per_user_unique_votes)
        elif self.current_round > 1:
            self.redistribution_unit.update_voted_items(previous_round_votes)

        # in every other round we first update the recommendation model
        all_individual_recs = self.single_user_recommender.recommend_individual_next_top_k(self.window_size, exclude_items)

        for user_id, votes in previous_round_votes.items():
            redistribution_queue_size = self.redistribution_unit.get_user_redistribution_queue_size(user_id)
            redistributed_part_size = min(self.threshold_policy.get_parameter_value(self.current_round, user_id), redistribution_queue_size)
            redistributed_part_size = int(round(float(redistributed_part_size)))
            new_recommendation_size = self.window_size - redistributed_part_size

            # get top-k for user
            next_round_recs[user_id] = all_individual_recs.get(user_id, [])[:new_recommendation_size]

            redistributed_items = self.redistribution_unit.get_redistributed_items(user_id, redistributed_part_size)
            next_round_recs[user_id] = next_round_recs[user_id] + [(item_id, 0.0) for item_id in redistributed_items]

        self.current_round += 1
        return next_round_recs

    def _filter_only_unique_items(sefl, previous_round_votes: Dict[str, List[Vote]]):

        sets = [set(votes) for votes in previous_round_votes.values()]
        common_votes = set.intersection(*sets)

        cleaned: Dict[int, List[Vote]] = {
            user_id: [v for v in votes if v not in common_votes]
            for user_id, votes in previous_round_votes.items()
        }

        return cleaned