import ast
import json
import logging
import math
from typing import Dict, List, Set, Union

import numpy as np
import pandas as pd
from psycopg2 import Error

from src.database.models import MemberData, UserVotes
from src.database.restaurant_database import fetch_restaurant_ratings, fetch_restaurants_data_by_restaurant_ids
from src.services.recommendations.restaurant.data.ratings_loader import RestaurantDbRatingsLoader
from src.services.recommendations.restaurant.models.places_api_convertor import PlacesAPI2RepConvertor


class RestaurantGroupModel:
    """
        Maintains the dynamic representation of a group of users during a recommendation
        session. It tracks currently connected members, aggregates their individual
        preference profiles (CB/CF), and updates the group profile as members join,
        leave, or cast votes. This aggregated profile is then used by the hybrid
        recommender to produce group-level recommendations.
    """

    def __init__(self, user_ids: List[str], cf_catalog: List[int], profiles_aggregation_method = "mean"):
        """ Keeps model for the group recommendations. """

        self._user_ids = user_ids

        self._profiles_aggregation_method = profiles_aggregation_method
        self._cf_catalog = cf_catalog

        self.base_preference_coef = 0.15 # how much do individual user history preferences add to the over all group profile
        self.session_options_preference_coef = 0.55 # how much do individual user preferences add to the over all group profile
        self.session_votes_coef = 1 - self.base_preference_coef - self.session_options_preference_coef # how much do individual user votes from the round adds

        self.update_coef = 0.4 # higher coef means recent history has greater impact

        # central tracking of all currently connected members in the session
        self._all_currently_connected_members_ids: Set[str] = set(user_ids)

        # individual users options in the sessions
        self._last_received_members_data: List[MemberData] = [] # the most recent users data (reference point for others)

        # individual profile data:
        self._cf_members_base_profiles: Dict[str, List[float]] = self._load_users_history_cf_vector(user_ids)
        self._cb_members_base_profiles: Dict[str, List[float]] = self._load_users_history_cb_vector(user_ids)

        self._cf_members_votes_profiles: Dict[str, List[float]]  = {
            user_id: [0.0] * len(self._cf_members_base_profiles[user_id])
            for user_id in user_ids
        }

        self._cb_members_votes_profiles: Dict[str, List[float]]  = {
            user_id: [0.0] * len(self._cb_members_base_profiles[user_id])
            for user_id in user_ids
        }

        # cb additionally has this encoding of user session options (to solve the cold start)
        self._cb_session_options_members_profiles: Dict[str, List[float]]  = {
            user_id: [0.0] * len(self._cb_members_base_profiles[user_id])
            for user_id in user_ids
        }

        self._last_cf_group_profile: List[float] = [0.0] * len(self._cf_members_base_profiles) # group vector for the cf recommendation
        self._last_cb_group_profile: List[float] = [0.0] * len(self._cf_members_base_profiles) # group vector for the cb recommendation

        # simple fallback random profile
        np.random.seed(42)
        self._fallback_random_profile = np.random.rand(PlacesAPI2RepConvertor.get_vector_dim())
        self._fallback_random_profile /= np.linalg.norm(self._fallback_random_profile)

    def get_all_connected_members_ids(self) -> Set[int]:
        """ Returns ids of considered (e.g. connected) users in the group (can be different from the initial user_ids list). """
        return self._all_currently_connected_members_ids

    def update_session_users(self, new_members_data: List[MemberData]):
        """ Updates group members session before the votes update.
            Ensures proper group profile adjustments after member disconnects/connects.
        """
        logging.info("here updating profile")
        # handle case someone disconnects
        if len(new_members_data) < len(self._all_currently_connected_members_ids):
            self._update_user_remove(new_members_data)
        elif len(new_members_data) > len(self._all_currently_connected_members_ids):
            self._update_user_add(new_members_data)

        self._update_session_options_profiles(new_members_data)

        # set the new previous members data (must happen after -- we use it as reference)
        self._last_received_members_data = new_members_data

    #region Update model on users disconnect/connect
    def _update_user_remove(self, new_members_data: List[MemberData]):
        """ Adjusts the model when a member disconnects from the session. """

        new_members_data_ids = {member_data.userUUID for member_data in new_members_data}
        last_members_ids = self._all_currently_connected_members_ids

        removed_members_ids = last_members_ids - new_members_data_ids

        # we also leave all the previous vectors in case user reconnects etc...

        # thus we only adjust tracked users ids:
        self._all_currently_connected_members_ids = new_members_data_ids

    def _update_user_add(self, new_members_data: List[MemberData]):
        """Adjusts the model when a new member connects to the session."""

        new_members_data_ids = {member_data.userUUID for member_data in new_members_data}
        self._all_currently_connected_members_ids = new_members_data_ids

    #endregion

    def _update_session_options_profiles(self, new_members_data: List[MemberData]):
        # we update all members options

        for member_data in new_members_data:
            member_metadata = member_data.metadata
            session_selected_options = member_metadata.sessionParameters
            user_selected_categories = session_selected_options.get("selectedCategories", {})
            self._cb_session_options_members_profiles[member_data.userUUID] = PlacesAPI2RepConvertor.restaurant_types_to_canonical(user_selected_categories)

    def update_model_with_votes(self, user_votes: UserVotes):
        """Updates model with new user votes."""

        if user_votes.userUUID in self._all_currently_connected_members_ids:
            self._update_cf_model_with_votes(user_votes)
            self._update_cb_profile(user_votes)
        else:
            logging.error("NOTICE!! received UUID of member that we are not tracking in hybrid recommender update model!!")

    def _update_cf_model_with_votes(self, user_votes: UserVotes):
        """Convert last-round user votes into a CF vector and update their vote representation."""

        catalog_ids = self._cf_catalog #self._model_data.get_model_catalog()
        id_to_idx = {rid: i for i, rid in enumerate(catalog_ids)}

        # Build new vote vector
        update_user_profile = np.zeros(len(catalog_ids))
        for v in user_votes.votingResult:
            if v.itemId in id_to_idx:
                update_user_profile[id_to_idx[v.itemId]] = RestaurantDbRatingsLoader.normalize_app_rating(v.rating, star_min=1.0, star_max=5.0)

        uid = user_votes.userUUID
        old_vec = np.array(self._cf_members_votes_profiles.get(uid, np.zeros_like(update_user_profile)))

        # Exponential moving average (EMA) update
        self._cf_members_votes_profiles[uid] = ((1 - self.update_coef) * old_vec + self.update_coef * update_user_profile).tolist()

    def _update_cb_profile(self, user_votes: UserVotes):
        """Updates user content based profile."""

        all_rated_restaurant_ids = [int(v.itemId) for v in user_votes.votingResult]
        restaurants_data_df = fetch_restaurants_data_by_restaurant_ids(all_rated_restaurant_ids)

        if restaurants_data_df.empty:
            logging.error("Restaurants content vector dataframe was empty during update!!! this should not happen??!")
            return

        vec = restaurants_data_df.iloc[0].content_vector
        if isinstance(vec, str):
            vec = ast.literal_eval(vec)

        aggregated_update_profile = np.zeros_like(np.array(vec, dtype=float))
        total_weight = 0.0

        for v in user_votes.votingResult:

            row = restaurants_data_df.loc[restaurants_data_df.id == int(v.itemId)]
            logging.info(f"aupdate vector: {row}")
            if row.empty:
                logging.info(f"aupdate vector: nope continued")
                continue


            restaurant_profile = np.array(row.iloc[0].content_vector, dtype=float)
            weight = RestaurantDbRatingsLoader.normalize_app_rating(v.rating, 1.0, 5.0) / 5.0

            aggregated_update_profile += restaurant_profile * weight
            total_weight += weight


        if total_weight > 0:
            aggregated_update_profile /= total_weight

        old_user_profile = np.array(self._cb_members_votes_profiles.get(user_votes.userUUID, np.zeros_like(aggregated_update_profile)))
        updated_user_profile = (1 - self.update_coef) * old_user_profile + self.update_coef * aggregated_update_profile

        self._cb_members_votes_profiles[user_votes.userUUID] = updated_user_profile.tolist()

    def get_total_number_of_user_votes_cf(self, user_id) -> int:
        """Returns number of votes user has in this profile for the cf recommendation"""

        if user_id not in self._cf_members_base_profiles or user_id not in self._cf_members_votes_profiles:
            raise Error("Non existing user id in the model.")

        cf_profile_base = np.array(self._cf_members_base_profiles[user_id])
        cf_profile_session = np.array(self._cf_members_votes_profiles[user_id])

        return np.count_nonzero(cf_profile_base) + np.count_nonzero(cf_profile_session)

    def get_cf_group_profile(self) -> np.ndarray:
        """Returns aggregated collaborative filtering group profile using predefined aggregation strategy.
            Aggregates on the fly from individual users profiles.
            Aggregates two profiles:
                - base historical profile of user (obtained from users historical session ratings)
                - dynamic session voting profile (updated with each new votes update)

            Each with predefined weight.
        """

        cf_group_base = self.aggregate_profiles(self._cf_members_base_profiles)
        cf_group_votes = self.aggregate_profiles(self._cf_members_votes_profiles)

        self._last_cf_group_profile = self.base_preference_coef * cf_group_base + (1 - self.base_preference_coef) * cf_group_votes

        return np.array(self._last_cf_group_profile)

    def get_cb_group_profile(self) -> np.ndarray:
        """Returns aggregated group content based profile using predefined aggregation strategy.
            Aggregates on the fly from individual user profiles.
            Aggregates three profiles:
                - base historical profile of user (obtained from users historical ratings)
                - dynamic session voting profile (updated with each new votes update)
                - profile based on the current user preferences and specific session options (expresses users temporary but fixed mood)

            Each with predefined weight.
        """
        cb_group_base = self.aggregate_profiles(self._cb_members_base_profiles)
        cb_group_votes = self.aggregate_profiles(self._cb_members_votes_profiles)
        cb_group_options = self.aggregate_profiles(self._cb_session_options_members_profiles)

        # rare edgecase in coldstart this may end up being zero...
        if (
            np.linalg.norm(cb_group_base) == 0 and
            np.linalg.norm(cb_group_votes) == 0 and
            np.linalg.norm(cb_group_options) == 0
        ):
            return self._fallback_random_profile

        self._last_cb_group_profile = self.base_preference_coef * cb_group_base + self.session_votes_coef * cb_group_votes + cb_group_options * self.session_options_preference_coef

        return np.array(self._last_cb_group_profile)

    def get_individual_cf_profiles(self) -> Dict[str, np.ndarray]:
        """Returns weighted CF profile for each connected member individually."""
        result = {}
        for uid in self._all_currently_connected_members_ids:
            base = np.array(self._cf_members_base_profiles.get(uid, []))
            votes = np.array(self._cf_members_votes_profiles.get(uid, []))
            result[uid] = self.base_preference_coef * base + (1 - self.base_preference_coef) * votes
        return result

    def get_individual_cb_profiles(self) -> Dict[str, np.ndarray]:
        """Returns weighted CB profile for each connected member individually."""
        result = {}
        for uid in self._all_currently_connected_members_ids:
            base = np.array(self._cb_members_base_profiles.get(uid, []))
            votes = np.array(self._cb_members_votes_profiles.get(uid, []))
            options = np.array(self._cb_session_options_members_profiles.get(uid, []))
            combined = (self.base_preference_coef * base
                        + self.session_votes_coef * votes
                        + self.session_options_preference_coef * options)
            if np.linalg.norm(combined) == 0:
                result[uid] = self._fallback_random_profile.copy()
            else:
                result[uid] = combined
        return result

    def get_cb_max_price(self, fallback_price = 3) -> int:
        # we select minimum from all users
        prices = []

        for member_data in self._last_received_members_data:
            if member_data.metadata is None:
                continue
            m_metadata = member_data.metadata
            if m_metadata.sessionParameters is not None:
                price = m_metadata.sessionParameters.get("restaurantPriceRange")
                if price is not None:
                    prices.append(price)

        logging.error(f"prices {prices}")
        if not prices:
            return fallback_price

        prices.sort()

        # 70 th percentile
        idx = math.ceil(0.7 * (len(prices) - 1))
        logging.error(f"percentile 7th price {prices[idx]}")
        return prices[idx]

    def aggregate_profiles(self, profiles_data: Dict[str, List[float]]) -> np.ndarray:
        """Creates single group profile from all the individual ones using predefined strategy."""
        connected_users_profiles = {
            user_id: profile
            for user_id, profile in profiles_data.items()
            if user_id in self._all_currently_connected_members_ids
        }

        if not connected_users_profiles:
            v_dims = len(next(iter(profiles_data.values())))
            return np.zeros(v_dims, dtype=float)

        score_matrix = list(connected_users_profiles.values())

        aggregated_vector = self._aggregate(score_matrix, self._profiles_aggregation_method)

        return aggregated_vector

    def _aggregate(
        self,
        score_matrix: Union[np.ndarray, List[List[float]]],
        method: str
    ) -> np.ndarray:
        """Aggregates a list or numpy matrix of user profiles using the specified method."""
        score_matrix = np.asarray(score_matrix, dtype=float)

        if method == 'mean':
            return np.mean(score_matrix, axis=0)
        elif method == 'min':
            return np.min(score_matrix, axis=0)
        elif method == 'max':
            return np.max(score_matrix, axis=0)
        elif method == 'median':
            return np.median(score_matrix, axis=0)
        elif method in ('multiplicative', 'geomean'):
            eps = 1e-12
            X = np.clip(score_matrix, eps, None)
            return np.exp(np.mean(np.log(X), axis=0))
        elif method == 'plurality':
            top = np.argmax(score_matrix, axis=1)
            n_items = score_matrix.shape[1]
            return np.bincount(top, minlength=n_items)
        elif method in getattr(self, "_custom_aggregation", {}):
            return self._custom_aggregation[method](score_matrix)
        else:
            raise ValueError(f"Unsupported aggregation method '{method}'")

    def _load_users_history_cf_vector(self, user_ids: List[str]) -> Dict[str, List[float]]:
        """Creates users base history profiles loading restaurant ratings from database."""

        # it is important to keep the order of the items
        restaurants_catalog_ids = self._cf_catalog
        # we load user ratings directly from the database for case user is not in the model
        users_ratings: pd.DataFrame = fetch_restaurant_ratings(user_ids)

        users_profiles = {}

        users_ratings["final_rating"] = users_ratings.apply(
            lambda row: RestaurantDbRatingsLoader.normalize_rating_row(row, star_min=1.0, star_max=5.0),
            axis=1
        )

        for uid in user_ids:
            users_profiles[uid] = self._construct_user_cf_profile_from_df(uid, users_ratings, restaurants_catalog_ids)

        return users_profiles

    def _construct_user_cf_profile_from_df(self, uid: str, users_ratings: pd.DataFrame, restaurants_catalog_ids: List[float]):

        id_to_index = {rid: idx for idx, rid in enumerate(restaurants_catalog_ids)}
        user_df = users_ratings[users_ratings["user_uuid"] == uid]

        # start with zero vector
        user_profile = [0.0] * len(restaurants_catalog_ids)

        # fill correct indexes
        for _, row in user_df.iterrows():
            item_id = row["restaurant_id"]
            if item_id in id_to_index:
                user_profile[id_to_index[item_id]] = row["final_rating"]

        return user_profile

    def _load_users_history_cb_vector(self, user_ids: List[str]) -> Dict[str, List[float]]:
        users_ratings_df = fetch_restaurant_ratings(user_ids)

        # If no user ratings exist at all, initialize everything with zeros and exit early
        if users_ratings_df.empty:
            logging.warning("No historical ratings found for any user. Initializing empty CB vectors.")
            return {uid: [0.0] * PlacesAPI2RepConvertor.get_vector_dim() for uid in user_ids}

        # Preload restaurant content vectors (avoid repeated DB calls)
        all_rated_restaurant_ids = users_ratings_df["restaurant_id"].unique().tolist()
        restaurants_data_df = fetch_restaurants_data_by_restaurant_ids(all_rated_restaurant_ids)

        # Map place_id → content_vector for quick lookup
        content_map = {
            row.id: np.array(row.content_vector, dtype=float)
            for _, row in restaurants_data_df.iterrows()
            if row.content_vector is not None
        }

        users_cb_profiles = {}

        for user_id in user_ids:
            user_ratings = users_ratings_df.loc[users_ratings_df["user_uuid"] == user_id]

            if user_ratings.empty:
                # user has no historical data — set zero vector
                users_cb_profiles[user_id] = [0.0] * PlacesAPI2RepConvertor.get_vector_dim()
                continue

            aggregated_profile = np.zeros_like(next(iter(content_map.values())))
            total_weight = 0.0

            for _, r in user_ratings.iterrows():
                rest_id = r["restaurant_id"]
                if rest_id not in content_map:
                    continue

                restaurant_profile = content_map[rest_id]
                weight = RestaurantDbRatingsLoader.normalize_app_rating(r["rating"], 1.0, 5.0) / 5.0

                aggregated_profile += restaurant_profile * weight
                total_weight += weight

            if total_weight > 0:
                aggregated_profile /= total_weight

            users_cb_profiles[user_id] = aggregated_profile.tolist()

        return users_cb_profiles

    def dispose_model(self):
        """Handles model disposal. Ensure all the profile data are safely stored in the database, resources are freed etc..."""
        pass

    def _load_history_cb_vector(self):
        pass