from datetime import datetime
import logging
import math
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple, Union

import numpy as np
import pandas as pd

from src.database.models import GpsLocation
from src.services.recommendations.algorithms.interface import RecAlgoFull
from src.services.recommendations.restaurant.models.cb_model import CbRecommendationRestrictions
from src.services.recommendations.restaurant.models.group_model import RestaurantGroupModel
from src.services.recommendations.restaurant.restaurant_recommender_service import RestaurantCbModel


class RestaurantsHybridRecommender:
    def __init__(self,
                    cf_model: RecAlgoFull,
                    cb_model: RestaurantCbModel,
                    group_model: RestaurantGroupModel,
                    max_cf_strength: float = 0.3,
                    cf_votes_half_saturation: int = 500
                ):
        """
        Initialize the MovieRecommender with a dataset directory.
            cf_model -- Collaborative filtering model.
            cb_model -- Content-based restaurant model.
            max_cf_strength -- Maximum possible weight of the CF part (0-1).
            cf_threshold_at_half_saturation --  Number of total group votes at which alpha (CF weight) reaches half of max_cf_strength. Controls how fast CF becomes influential.
        """

        if (max_cf_strength < 0 or max_cf_strength > 1):
            raise ValueError("max_cf_strength must be in between (0, 1)")

        self._max_cf_strength = max_cf_strength

        # controls how fast CF signal becomes influential (e.g. entire group has to have at least 500 votes in total so the influence of the CF signal is 50%)
        self._cf_threshold_at_half_saturation = cf_votes_half_saturation

        self._group_model = group_model

        self.cf_model: RecAlgoFull = cf_model
        self.cb_model: RestaurantCbModel = cb_model

        self.cf_cached_scores: pd.DataFrame
        self.cb_cached_scores: pd.DataFrame

        self._default_search_city_coords = GpsLocation(50.08804, 14.42076) # coords for Prague
        self._default_search_radius_meters = 1500

    def recommend_individual_next_top_k(
        self, top_k: int, exclude_items: List[int]
    ) -> Dict[str, List[Tuple[int, float]]]:
        """Returns top-k recommendations per connected member, based on individual profiles.

        Uses the same CF/CB weighting and alpha logic as the group recommender,
        but skips the group aggregation step — each user gets their own ranked list.
        """
        individual_cf = self._group_model.get_individual_cf_profiles()
        individual_cb = self._group_model.get_individual_cb_profiles()

        for uid, vec in individual_cf.items():
            logging.info(f"CF profile {uid}: nonzero={np.count_nonzero(vec)}, norm={np.linalg.norm(vec):.4f}")
        for uid, vec in individual_cb.items():
            logging.info(f"CB profile {uid}: nonzero={np.count_nonzero(vec)}, norm={np.linalg.norm(vec):.4f}")

        group_members_ids = list(self._group_model.get_all_connected_members_ids())
        alpha = self._mixing_alpha_value(group_members_ids)

        results = {}

        for uid in group_members_ids:
            # CF scores for this user
            cf_item_scores = self.cf_model.get_item_scores_from_external_vector(individual_cf[uid])
            cf_df = pd.DataFrame.from_dict(cf_item_scores, orient="index", columns=["score"])
            cf_df.index.name = "id"
            cf_df = self._normalize_and_sort_recommendations(cf_df)

            # CB scores for this user
            max_price = self._group_model.get_cb_max_price()
            cb_df = self.cb_model.get_all_recommendation_by_external_profile(
                individual_cb[uid],
                CbRecommendationRestrictions(
                    self._default_search_city_coords,
                    self._default_search_radius_meters,
                    exclude_items,
                    False,
                    max_price,
                ),
            )
            cb_df = self._normalize_and_sort_recommendations(cb_df)

            # Merge + hybrid score (same as for groups)
            merged = cb_df.join(cf_df, lsuffix="_cb", rsuffix="_cf", how="inner")
            merged["score_hybrid"] = (1 - alpha) * merged["score_cb"] + alpha * merged["score_cf"]
            if exclude_items:
                merged = merged[~merged.index.isin(exclude_items)]
            merged = merged.sort_values("score_hybrid", ascending=False)

            top3 = merged.head(3)
            logging.info(f"Top 3 for {uid}: {list(zip(top3.index.tolist(), top3['score_hybrid'].round(4).tolist()))}")

            top = merged.head(top_k)
            results[uid] = list(zip(top.index.tolist(), top["score_hybrid"].tolist()))

        return results

    def recommend_next_top_k(self, top_k: int, exclude_items: List[int]) -> List[Tuple[int, float]]:
        """ Returns top k recommendations for given group.
        Args:
            group (List[int]): List of user ids to recommend to.
            context (RestaurantContext): Restaurant context.
            exclude_items (List[int]): Items to exclude from recommendation.
        """

        self._update_cached_scores(exclude_items)

        group_members_ids = list(self._group_model.get_all_connected_members_ids())
        hybrid_recommendation_df = self._generate_hybrid_recommendation_k(group_members_ids, exclude_items)

        top_df = hybrid_recommendation_df.head(top_k)

        return list(
            zip(
                top_df.index.tolist(),
                top_df["score_hybrid"].tolist()
            )
        )

    def _generate_hybrid_recommendation_k(self, group_members_ids: List[str], exclude_items: List[int]):

        alpha = self._mixing_alpha_value(group_members_ids)
        cf_df = self.cf_cached_scores
        cb_df = self.cb_cached_scores

        merged = cb_df.join(cf_df, lsuffix="_cb", rsuffix="_cf", how="inner")

        merged["score_hybrid"] = (1 - alpha) * merged["score_cb"] + alpha * merged["score_cf"]

        if exclude_items:
            merged = merged[~merged.index.isin(exclude_items)]

        merged = merged.sort_values("score_hybrid", ascending=False)

        merged = merged[["score_cb", "score_cf", "score_hybrid"]]

        return merged

    def _mixing_alpha_value(self, group_members_ids: List[str]):

        # for each user we find his alpha based no his total number of votes
        alphas = []

        k = - math.log(0.5) / self._cf_threshold_at_half_saturation

        for uid in group_members_ids:
            votes = self._group_model.get_total_number_of_user_votes_cf(uid)
            alpha_i = self._max_cf_strength * (1 - math.exp(-k * votes))
            alphas.append(alpha_i)

        # we take average over all
        alpha = sum(alphas) / len(alphas)
        logging.info(f"ALPHA {alpha}")
        return alpha

    def _update_cached_scores(self, excluded_items: List[int]):

        self._update_cf_scores()
        self._updated_cb_scores(excluded_items)

    def _update_cf_scores(self) -> np.ndarray:
        cf_group_profile = self._group_model.get_cf_group_profile()
        items_catalog = self.cf_model.get_items_catalog()

        item_scores = self.cf_model.get_item_scores_from_external_vector(cf_group_profile)
        cf_rec_df = pd.DataFrame.from_dict(item_scores, orient="index", columns=["score"])
        cf_rec_df.index.name = "id"
        self.cf_cached_scores = self._normalize_and_sort_recommendations(cf_rec_df)

    def _updated_cb_scores(self, excluded_items: List[int]) -> np.ndarray:
        cb_group_profile = self._group_model.get_cb_group_profile()
        max_price = self._group_model.get_cb_max_price()

        cb_rec_df = self.cb_model.get_all_recommendation_by_external_profile(cb_group_profile,
                                                                        CbRecommendationRestrictions(
                                                                            self._default_search_city_coords,
                                                                            self._default_search_radius_meters,
                                                                            excluded_items,
                                                                            False,
                                                                            max_price
                                                                        ))

        self.cb_cached_scores = self._normalize_and_sort_recommendations(cb_rec_df)

    def _normalize_and_sort_recommendations(self, rec_df: pd.DataFrame) -> pd.DataFrame:

        score_min, score_max = rec_df["score"].min(), rec_df["score"].max()
        if score_max == score_min:
            rec_df["score"] = 0.0
        else:
            rec_df["score"] = (rec_df["score"] - score_min) / (score_max - score_min)

        rec_df = rec_df.sort_values("score", ascending=False).reset_index()
        rec_df = rec_df.set_index("id")

        return rec_df