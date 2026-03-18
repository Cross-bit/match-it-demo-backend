from datetime import datetime
from typing import Any, List
import logging
from src.controllers.DTOs.matching_session_dtos import RecommendationUpdateDTO
from src.services.recommendations.algorithms.async_algorithm.redistribution_unit import RedistributionUnit
from src.services.recommendations.algorithms.async_algorithm.threshold_policy import ThresholdPolicyStatic

from src.services.recommendations.movie.models.async_group_movie_rec import HybridGroupMovieRecommender, MovieRecPriorityFunction
from src.services.recommendations.movie.models.cf_model import DiversifiedRecommender
from src.services.recommendations.movie.models.group_model import MovieGroupModel
from src.services.recommendations.movie.models.methods.method_factory import AlgoMethodFactory, AlgoContext
from src.domain.session_parameters import AlgorithmType

#
# Async group recommender as presented in the paper
#

class MovieSessionRecord:

    def __init__(
        self,
        session_id: str,
        users_ids: List[str],
        rec_model: HybridGroupMovieRecommender
    ):
        self.session_id = session_id
        self.users_ids = users_ids
        self.rec_model = rec_model
        self._group_model: MovieGroupModel = None
        self.all_voted_items: set[int] = set()
        self.last_votes: dict[str, Any] = {}
        self.created_at = datetime.now()

    @staticmethod
    def create(
                session_id: str,
                users_ids: List[str],
                recommender: DiversifiedRecommender,
                recommendation_size: int = 5,
                algorithm: AlgorithmType = AlgorithmType.HYBRID
                ) -> "MovieSessionRecord":

        items_catalog = recommender.get_catalog()
        group_model = MovieGroupModel(users_ids, items_catalog)

        ctx = AlgoContext(
            users_ids= users_ids,
            recommender= recommender,
            recommendation_size= recommendation_size,
            group_model=group_model
        )

        engine = AlgoMethodFactory.create_method(algorithm, ctx)

        rec = MovieSessionRecord(session_id, users_ids, engine)
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
        logging.info("updating members")
        self.rec_model.update_on_group_size_changed(session.members)
        self._group_model.update_session_users(session.members)

        self.last_votes = {
            user_votes.userUUID: user_votes.votingResult
            for user_votes in update_data.usersVotingResults
        }

        for user_votes in update_data.usersVotingResults:
            self._group_model.update_model_with_votes(user_votes)
            for vote in user_votes.votingResult:
                self.all_voted_items.add(vote.itemId)