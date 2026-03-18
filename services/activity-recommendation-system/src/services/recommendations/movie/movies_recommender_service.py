from collections import defaultdict
import logging
import threading
from typing import Dict, List, Tuple
from src.controllers.DTOs.matching_session_dtos import MatchingSessionInfoDTO, NextRecommendationItem, RecommendationUpdateDTO
from src.controllers.DTOs.movie_dtos import MovieCardDTO
from src.database.models import UserVotes
from src.services.gateways.movie_data_gateway import (TMDBGateway, movielens_ids_to_tmdb_ids)
import src.database.user_votes_database as db
from src.domain.movie_card import MovieCard
from src.services.recommendations.algorithms.async_algorithm.models import Vote
from src.services.recommendations.movie.models.cf_model import DiversifiedRecommender
from src.services.recommendations.movie.models.session_record import MovieSessionRecord
from src.domain.session_parameters import AlgorithmType
#
# Async group recommender as presented in the paper
#

class MovieRecommenderService:
    def __init__(self, recommender: DiversifiedRecommender, recommendation_size: int):
        self._recommender_model: DiversifiedRecommender = recommender
        self._session_records: Dict[str, MovieSessionRecord] = {}
        self._session_locks = defaultdict(threading.Lock)

        self._recommendation_size = recommendation_size

    def recommend_next(self, update_dto: RecommendationUpdateDTO) -> Dict[str, List[Tuple[int, float]]]:
        """ Updates model with last users votes and returns new top k group recommendations for current users.
        Args:
            group (List[int]): List of user ids to recommend to.
            context (RestaurantContext): Restaurant context.
            exclude_items (List[int]): Items to exclude from recommendation.
        """

        session = update_dto.session
        session_id = session.sessionUUID

        lock = self._session_locks[session_id]

        with lock: # same session one at the time!
            self._ensure_session_initialized(session)

            session = self._session_records[session_id]

            session.update_group_data(update_dto)

            self._update_users_votes_in_db(update_dto)

            gr_recommender = session.rec_model

            session_votes = self.map_users_voting_results(update_dto.usersVotingResults)

            next_recommendation = gr_recommender.get_next_round_recommendation(session_votes, list(session.all_voted_items))

            return next_recommendation

    def clear_session(self, sessionId: str):
        self._session_records.pop(sessionId, None)

    def get_movie_cards_response(
        self,
        users_recommendations: Dict[str, List[Tuple[int, float]]]
    ) -> Dict[str, List[NextRecommendationItem]]:
        """
        Converts recommendations for users to the API next data DTOs mapping.
        users_recommendations: mapping of user_id to the list of his recommendations (item_id, score)
        Returns:
            Dict[str, List[NextRecommendationItem]]: returns the final dictionary of rec DTOs for users
        """
        movies_gateway = TMDBGateway()
        result: Dict[str, List[NextRecommendationItem]] = {}

        for user_id, recommendation in users_recommendations.items():

            movie_ids = [movie_id for movie_id, _ in recommendation]
            tmdb_ids = movielens_ids_to_tmdb_ids(movie_ids)

            movie_cards: List[MovieCard] = movies_gateway.get_movies_details(tmdb_ids)

            dtos = { card.cardId: MovieCardDTO.from_domain(card) for card in movie_cards }

            result[user_id] = []

            for movie_id, score in recommendation:
                if movie_id not in dtos:
                    logging.warning(f"[Recommender] Missing DTO for movie_id={movie_id}, skipping")
                    continue

                rec_item = NextRecommendationItem(int(movie_id), float(score), dtos[int(movie_id)])
                result[user_id].append(rec_item)

        return result

    def _ensure_session_initialized(self, session: MatchingSessionInfoDTO):
        session_id = session.sessionUUID
        if session_id not in self._session_records:
            self._init_new_session_recommendation(session)

    def _init_new_session_recommendation(self, session: MatchingSessionInfoDTO):

        session_id = session.sessionUUID
        session_users_ids = [user.userUUID for user in session.members]

        algo_type = self._get_algo_type(session)
        logging.info(f"ALGO TYPEEE: {algo_type}")
        self._session_records[session_id] = MovieSessionRecord.create(session_id,
                                                                        session_users_ids,
                                                                        self._recommender_model,
                                                                        self._recommendation_size,
                                                                        algo_type
                                                                        )

    def _get_algo_type(self, session: MatchingSessionInfoDTO) -> AlgorithmType:


        logging.info("Resolving algorithm type")

        for member in session.members:
            logging.info(member.model_dump())
            if member.isCreator:
                metadata = member.metadata
                if not metadata:
                    continue

                params = metadata.sessionParameters
                if not params:
                    continue

                algo_value = params.get("algorithm", "NONE")

                try:
                    algo_type = AlgorithmType(algo_value)
                except ValueError:
                    logging.warning(f"Unknown algorithm type: {algo_value}")
                    return AlgorithmType.NONE

                if algo_type != AlgorithmType.NONE:
                    logging.info(f"Selected algorithm: {algo_type}")
                    return algo_type


        logging.info("No algorithm specified, using NONE")
        return AlgorithmType.NONE



    def _update_users_votes_in_db(self, update_data: RecommendationUpdateDTO):
        """
            Update movies votes in persistent layer.
        """

        db.update_user_movie_votes(update_data.usersVotingResults)

        logging.info(f"All members updated for session")

    def map_users_voting_results(self, usersVotingResults: List[UserVotes]) -> Dict[str, List[Vote]]:
        """
        usersVotingResults: List[UserLastRoundVotes]
        returns: dict[userUUID, List[Vote]]
        """
        mapped = {}

        for user in usersVotingResults:
            votes = [
                Vote(id=int(v.itemId), value=v.rating)
                for v in user.votingResult
            ]
            mapped[user.userUUID] = votes

        return mapped