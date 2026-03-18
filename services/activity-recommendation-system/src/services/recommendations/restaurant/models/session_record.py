import logging
from pathlib import Path
from datetime import datetime
from typing import Any, List, Set

from src.controllers.DTOs.matching_session_dtos import RecommendationUpdateDTO
from src.domain.session_parameters import AlgorithmType
from src.services.recommendations.algorithms.interface import RecAlgoFull

from src.services.recommendations.restaurant.models.group_model import RestaurantGroupModel
from src.services.recommendations.restaurant.models.hybrid_model import RestaurantsHybridRecommender
from src.services.recommendations.restaurant.restaurant_recommender_service import RestaurantCbModel
from src.services.recommendations.restaurant.models.methods.method_factory import AlgoMethodFactory, AlgoContext
from src.services.recommendations.restaurant.models.methods.sync_group_models import SyncGroupRestaurantRecommender


class RestaurantSessionRecord:
    """
        Model of currently on going restaurant recommendation session.
    """

    def __init__(
        self,
        session_id: str,
        users_ids: List[str],
        rec_model: SyncGroupRestaurantRecommender,
    ):
        self.session_id = session_id
        self.users_ids = users_ids
        self.rec_model = rec_model
        self._group_model: RestaurantGroupModel = None
        self.all_voted_items: set[int] = set()
        self.last_votes: dict[str, Any] = {}
        self.created_at = datetime.now()

    @staticmethod
    def create(session_id: str,
                users_ids: List[str],
                cf_model: RecAlgoFull,
                cb_model: RestaurantCbModel,
                recommendation_size: int = 5,
                algorithm: AlgorithmType = AlgorithmType.HYBRID
                ) -> "RestaurantSessionRecord":

        items_catalog = cf_model.get_items_catalog()
        group_model = RestaurantGroupModel(users_ids, items_catalog)

        recommender = RestaurantsHybridRecommender(
            cf_model,
            cb_model,
            group_model
        )

        ctx = AlgoContext(
            users_ids= users_ids,
            recommender= recommender,
            recommendation_size= recommendation_size,
            group_model=group_model
        )

        engine = AlgoMethodFactory.create_method(algorithm, ctx)

        rec = RestaurantSessionRecord(session_id, users_ids, engine)
        rec._group_model = group_model
        return rec

    def update_group_data(self, update_data: RecommendationUpdateDTO):
        """
            Update session state when a new payload about session members arrives.
            This ensures consistent state inside the session object.
        """

        session = update_data.session
        self.users_ids = [user.userUUID for user in session.members]

        # 2. update group model (handles join/leave)
        #self.rec_model.update_on_group_size_changed(session.members)
        self._group_model.update_session_users(session.members)

        self.last_votes = {
            user_votes.userUUID: user_votes.votingResult
            for user_votes in update_data.usersVotingResults
        }

        for user_votes in update_data.usersVotingResults:
            self._group_model.update_model_with_votes(user_votes)
            for vote in user_votes.votingResult:
                self.all_voted_items.add(vote.itemId)

        logging.info("ALL VOTED ITEMS (to exclude them)")
        logging.info(self.all_voted_items)