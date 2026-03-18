from dataclasses import dataclass
from datetime import datetime
import logging
from typing import Any, List
from src.controllers.DTOs.matching_session_dtos import RecommendationUpdateDTO
from src.services.recommendations.algorithms.async_algorithm.redistribution_unit import RedistributionUnit
from src.services.recommendations.algorithms.async_algorithm.threshold_policy import ThresholdPolicyStatic
from src.services.recommendations.movie.models.methods.priority_functions import MovieRecPriorityFunction
from src.services.recommendations.movie.models.methods.hybrid_group_models import HybridGroupMovieRecommender
from src.services.recommendations.movie.models.methods.async_group_models import AsyncGroupMovieRecommender
from src.services.recommendations.movie.models.methods.sync_group_models import SyncGroupMovieRecommender

from src.services.recommendations.movie.models.cf_model import DiversifiedRecommender
from src.services.recommendations.movie.models.group_model import MovieGroupModel
from src.domain.session_parameters import AlgorithmType


@dataclass
class AlgoContext:
    users_ids: list
    recommender: object
    recommendation_size: int
    group_model: MovieGroupModel

class AlgoMethodFactory:

    @staticmethod
    def create_method(algo_type: AlgorithmType, ctx: AlgoContext):

        if isinstance(algo_type, str):
            algo_type = AlgorithmType(algo_type)

        match algo_type:
            case AlgorithmType.HYBRID:
                logging.info("Creating hybrid movie group recommender.")
                return AlgoMethodFactory.create_hybrid_algo(ctx)
            case AlgorithmType.ASYNC:
                logging.info("Creating async movie group recommender.")
                return AlgoMethodFactory.create_async_algo(ctx)
            case AlgorithmType.SYNC:
                logging.info("Creating sync movie group recommender.")
                return AlgoMethodFactory.create_sync_algo(ctx)
            case _:
                raise ValueError("Unknown algorithm")


    @staticmethod
    def create_hybrid_algo(ctx):
        group_model = ctx.group_model
        priority_function = MovieRecPriorityFunction(ctx.users_ids, ctx.group_model, ctx.recommender)
        redistribution_unit = RedistributionUnit(ctx.users_ids, priority_function)
        first_round_ratio = 3
        threshold_policy = ThresholdPolicyStatic(3)
        engine = HybridGroupMovieRecommender(
            ctx.users_ids,
            ctx.recommender,
            ctx.group_model,
            redistribution_unit,
            first_round_ratio,
            threshold_policy,
            ctx.recommendation_size,
        )

        return engine

    @staticmethod
    def create_async_algo(ctx):
        priority_function = MovieRecPriorityFunction(ctx.users_ids, ctx.group_model, ctx.recommender)
        redistribution_unit = RedistributionUnit(ctx.users_ids, priority_function)
        threshold_policy = ThresholdPolicyStatic(3)

        engine = AsyncGroupMovieRecommender(
            ctx.users_ids,
            ctx.recommender,
            ctx.group_model,
            redistribution_unit,
            threshold_policy,
            ctx.recommendation_size,
        )

        return engine

    @staticmethod
    def create_sync_algo(ctx):
        engine = SyncGroupMovieRecommender(ctx.users_ids, ctx.group_model, ctx.recommender, ctx.recommendation_size)

        return engine



