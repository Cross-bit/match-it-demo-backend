from typing import Dict, List, Tuple
from src.services.recommendations.algorithms.async_algorithm.models import Vote
from src.services.recommendations.restaurant.models.group_model import RestaurantGroupModel
from src.services.recommendations.movie.models.cf_model import DiversifiedRecommender
from src.services.recommendations.restaurant.models.hybrid_model import RestaurantsHybridRecommender


class SyncGroupRestaurantRecommender:

    def __init__(self, users_ids: List[int],
                group_model: RestaurantGroupModel,
                algorithm: RestaurantsHybridRecommender,
                window_size: int):

        self.group_model = group_model

        self.current_round = 0
        self.window_size = window_size
        self.users_ids = users_ids
        self.single_user_recommender = algorithm

        if (len(users_ids) != len(set(users_ids))):
            raise ValueError("Duplicate user UUIDs found!")


    def update_on_group_size_changed(self, new_users_ids: List[str]) -> None:
        self.users_ids = [m.userUUID for m in new_users_ids]

    #def recommend_next_top_k(self, top_k: int, exclude_items: List[int]) -> List[Tuple[int, float]]:

    def get_next_round_recommendation(self, previous_round_votes: Dict[str, List[Vote]], exclude_items: List[int]) -> Dict[str, List[Tuple[int, float]]]:
        """ Updates the internal state based on user votes from previous rounds
            and returns a new list of recommended items for each user.
            Args:
                users_votes (Dict[str, List[Item]]): Users votes from the last round.
            Returns:
                List[int]: New list of recommendations for each user.
        """

        next_round_recs: Dict[str, List[Vote]] = {}

        new_recommendations = self.single_user_recommender.recommend_next_top_k(self.window_size, list(exclude_items))

        for user_id, votes in previous_round_votes.items():
            # everyone gets the same (sync) data
            next_round_recs[user_id] = new_recommendations

        self.current_round += 1
        return next_round_recs