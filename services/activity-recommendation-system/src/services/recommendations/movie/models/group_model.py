import logging
import random
import numpy as np
import pandas as pd
from psycopg2 import Error
from typing import Dict, List, Set, Union
from src.database.models import MemberData, UserVotes
import src.database.user_votes_database as db
from src.services.recommendations.movie.utils.ratings_convertor import MovieRatingsConvertor


class MovieGroupModel:

    def __init__(self, user_ids: List[str], cf_catalog: List[int], profiles_aggregation_method = "mean"):
        """ Keeps model for the group recommendations. """

        random_id = random.randint(100000, 999999)
        logging.info(f"here new {random_id}")

        self._user_ids = user_ids

        self._profiles_aggregation_method = profiles_aggregation_method
        self._cf_catalog = cf_catalog

        self.base_preference_coef = 0.3 # group history to group session voting history
        self.update_coef = 0.4 # higher coef means recent history has greater impact

        # central tracking of all currently connected members in the session
        self._all_currently_connected_members_ids: Set[str] = {42}

        # individual users options in the sessions
        self._last_received_members_data: Dict[str, List[MemberData]] = {} # the most recent users data (reference point for others)

        # individual profile data:
        self._cf_members_base_profiles: Dict[str, List[float]] = self._load_users_history_cf_vector(user_ids)

        self._cf_members_votes_profiles: Dict[str, List[float]]  = {
            user_id: [0.0] * len(self._cf_members_base_profiles[user_id])
            for user_id in user_ids
        }

        self._last_cf_group_profile: List[float] = [0.0] * len(self._cf_catalog) # group vector for the cf recommendation

    def get_all_connected_members_ids(self) -> Set[str]:
        return self._all_currently_connected_members_ids

    def update_session_users(self, new_members_data: List[MemberData]):
        """ Updates group members session before the votes update.
            Ensures proper group profile adjustments after member disconnects/connects.
        """
        # handle case someone disconnects
        if len(new_members_data) < len(self._all_currently_connected_members_ids):
            self._update_user_remove(new_members_data)
        elif len(new_members_data) > len(self._all_currently_connected_members_ids):
            self._update_user_add(new_members_data)

        logging.info(f"session users udpated: {new_members_data}")
        # set the new previous members data (must happen after -- we use it as reference)
        self._last_received_members_data = new_members_data

    def _update_user_remove(self, new_members_data: List[MemberData]):
        """ Adjusts the model when a member disconnects from the session. """


        logging.info("removing members update")
        logging.info(new_members_data)

        new_members_data_ids = {member_data.userUUID for member_data in new_members_data}
        last_members_ids = self._all_currently_connected_members_ids

        removed_members_ids = last_members_ids - new_members_data_ids

        # we also leave all the previous vectors in case user reconnects etc...

        # thus we only adjust tracked users ids:
        self._all_currently_connected_members_ids = new_members_data_ids
        logging.info(self._all_currently_connected_members_ids)

    def _update_user_add(self, new_members_data: List[MemberData]):
        """Adjusts the model when a new member connects to the session."""

        logging.info("adding members update")
        logging.info(new_members_data)

        new_members_data_ids = {member_data.userUUID for member_data in new_members_data}
        self._all_currently_connected_members_ids = new_members_data_ids
        logging.info(self._all_currently_connected_members_ids)

    def update_model_with_votes(self, user_votes: UserVotes):
        """ Updates model with new user votes. """

        if user_votes.userUUID in self._all_currently_connected_members_ids:
            self._update_cf_model_with_votes(user_votes)
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
                update_user_profile[id_to_idx[v.itemId]] = MovieRatingsConvertor.normalize_app_rating(v.rating, star_min=1.0, star_max=5.0)

        uid = user_votes.userUUID
        old_vec = np.array(self._cf_members_votes_profiles.get(uid, np.zeros_like(update_user_profile)))

        # Exponential moving average (EMA) update
        self._cf_members_votes_profiles[uid] = ((1 - self.update_coef) * old_vec + self.update_coef * update_user_profile).tolist()

    def get_total_number_of_user_votes_cf(self, user_id) -> int:
        """Returns number of votes user has in this profile for the cf recommendation"""

        if user_id not in self._cf_members_base_profiles or user_id not in self._cf_members_votes_profiles:
            raise Error("Non existing user id in the model.")

        cf_profile_base = np.array(self._cf_members_base_profiles[user_id])
        cf_profile_session = np.array(self._cf_members_votes_profiles[user_id])

        return np.count_nonzero(cf_profile_base) + np.count_nonzero(cf_profile_session)

    def get_cf_user_profile(self, userUUID: str) -> np.ndarray:

        logging.info("users_connected:")
        logging.info(self._all_currently_connected_members_ids)
        logging.info(f"userUUID:{userUUID}")
        if userUUID not in self._all_currently_connected_members_ids:
            logging.error(f"[MOVIES MODEL] User {userUUID} is not connected! Returning zero vector...", extra={"userUUID": userUUID})
            return np.zeros(len(self._cf_catalog))

        user_base_profile = np.asarray(self._cf_members_base_profiles[userUUID])
        user_votes_profile = np.asarray(self._cf_members_votes_profiles[userUUID])

        self._last_cf_group_profile = self.base_preference_coef * user_base_profile + (1 - self.base_preference_coef) * user_votes_profile

        return np.array(self._last_cf_group_profile)

    def get_cf_group_profile(self) -> np.ndarray:

        cf_group_base = self._aggregate_profiles(self._cf_members_base_profiles)
        cf_group_votes = self._aggregate_profiles(self._cf_members_votes_profiles)

        self._last_cf_group_profile = self.base_preference_coef * cf_group_base + (1 - self.base_preference_coef) * cf_group_votes

        return np.array(self._last_cf_group_profile)

    def _aggregate_profiles(self, profiles_data: Dict[str, List[float]]):

        connected_users_profiles = {
            user_id: profile
            for user_id, profile in profiles_data.items()
            if user_id in self._all_currently_connected_members_ids
        }

        if not connected_users_profiles:
            v_dims = len(next(iter(profiles_data.values())))
            return np.zeros(v_dims, dtype=float) # todo: better!!

        score_matrix = list(connected_users_profiles.values())

        aggregated_vector = self._aggregate(score_matrix, self._profiles_aggregation_method)

        return aggregated_vector

    def _aggregate(
        self,
        score_matrix: Union[np.ndarray, List[List[float]]],
        method: str
    ) -> np.ndarray:
        """
        Aggregates a list or numpy matrix of user profiles using the specified method.
        """
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

    def _load_users_history_cf_vector(self, user_ids: List[str]): # -> Dict[str, List[float]]

        # it is important to keep the order of the items
        movies_catalog_ids = self._cf_catalog

        # we load user ratings directly from the database for case user is not in the model
        users_ratings: pd.DataFrame = db.fetch_movie_ratings_df(user_ids)

        users_profiles = {}

        users_ratings["final_rating"] = users_ratings.apply(
            lambda row: MovieRatingsConvertor.normalize_rating_row(row, star_min=1.0, star_max=5.0),
            axis=1
        )

        for uid in user_ids:
            users_profiles[uid] = self._construct_user_cf_profile_from_df(uid, users_ratings, movies_catalog_ids)

        return users_profiles

    def _construct_user_cf_profile_from_df(self, uid: str, users_ratings: pd.DataFrame, movies_catalog_ids: List[int]):

        logging.info("movies_catalog_ids")

        # map movie_id → index in final CF vector
        id_to_index = {rid: idx for idx, rid in enumerate(movies_catalog_ids)}

        user_df = users_ratings[users_ratings["user_id"] == uid]

        # start with zero vector
        user_profile = [0.0] * len(movies_catalog_ids)

        #logging.info("COLUMNS -> %s", users_ratings.columns.tolist())
        #logging.info("HEAD -> %s", users_ratings.head(3).to_dict())
        #logging.info("DTYPES -> %s", users_ratings.dtypes)

        # fill indexes where user has a rating
        for _, row in user_df.iterrows():
            movie_id = row["movie_id"]
            if movie_id in id_to_index:
                user_profile[id_to_index[movie_id]] = row["final_rating"]

        return user_profile

    def dispose_model(self):
        """ Handles model disposal. Ensure all the profile data are safely stored in the database, resources are freed etc... """
        pass