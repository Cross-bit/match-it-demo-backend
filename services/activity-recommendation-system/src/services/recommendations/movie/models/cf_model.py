#!/bin/python3
import logging
import os
import re
import unicodedata
import warnings
from pathlib import Path
import numpy as np
import pandas as pd
import pickle
from typing import Collection, Dict, Optional, Tuple
from scipy.sparse import csr_matrix, vstack
from sklearn.metrics import ndcg_score

from src.database.user_votes_database import get_all_movie_ratings_df
from src.services.recommendations.movie.utils.movies_similarity import MovieTitleSimilarity

# ===================================
# DESCRIPTION
# ===================================
# Implementation of Easer algorithm according to the original paper
# https://arxiv.org/pdf/1905.03375
#
# + evaluations


ROOT = Path(__file__).resolve().parent
MOVIE_LENS_DATASET_DIR = ROOT / "../../../datasets/movies/ml"
MODEL_DIR = ROOT / "../../../models/movies"

class EaserModel:
    def __init__(self, l2: float = 1600, model_file_name = "model_easer.pkl"):
        self.l2 = l2
        self.B = None

        #self.ml_dataset_ratings_path = MOVIE_LENS_DATASET_DIR / "ratings.pkl"
        self.model_path = MODEL_DIR / model_file_name

        # Optional maps — useful for evaluation/test datasets
        #self.user_id_to_row: Dict[int, int] = {}
        self.item_id_to_col: Dict[int, int] = {}
        self.col_to_item_id: Dict[int, int] = {}

        # Optional training data for user_id predictions
        self._train_ratings: Optional[csr_matrix] = None

        self._load_model()

    def get_catalog(self):
        return self.item_id_to_col.keys()

    def recommend_by_profile(self, profile: np.ndarray):
        if self.B is None:
            raise RuntimeError("Model not fitted or B not loaded.")
        return profile @ self.B

    def retrain_model(self, base_dataset_dir = None):
        self.dataset_directory = base_dataset_dir or MOVIE_LENS_DATASET_DIR

        # 1) first we load original MovieLens users ratings
        ml_ratings_df = None

        try:
            logging.info("[MOVIES MODEL] Loading local ratings.csv")
            ml_ratings_df = pd.read_csv(f'{self.dataset_directory}/ratings.csv',
                                names=['userId', 'movieId', 'ratings'],
                                header=0
                                )

            # fix names
            ml_ratings_df = ml_ratings_df.rename(columns={"ratings": "rating", "userId": "user_id", "movieId": "movie_id"})

            logging.info("[MOVIES MODEL] MovieLens ratings.csv loaded successfully.")
        except Exception as e:
            logging.error(f"Error loading ratings.dat: {e}")
            return

        # 2) we try to load all our users ratings

        max_app_latest_ratings = 50_000
        logging.info(f"[MOVIES MODEL] Loading app users latest {max_app_latest_ratings} ratings")
        app_user_data_df = get_all_movie_ratings_df(max_app_latest_ratings)
        logging.info(f"[MOVIES MODEL] Loaded {app_user_data_df.shape[0]} users app ratings")

        logging.info(f"[MOVIES MODEL] Converting datasets to CSR format")
        # 3) we convert to csr and combine them
        app_csr, app_user_map, app_item_map = self._df_to_csr(app_user_data_df, user_col="user_id", item_col="movie_id", rating_col="rating")
        ml_csr, ml_user_map, ml_item_map = self._df_to_csr(ml_ratings_df, user_col="user_id", item_col="movie_id", rating_col="rating")

        logging.info(f"[MOVIES MODEL] Filtering quality ratings from MovieLens")
        # use only users and items that have enough ratings
        ml_csr_dense, ml_u_dense_map, ml_i_dense_map = self._filter_csr_by_interaction_thresholds(ml_csr, ml_user_map, ml_item_map, min_user_interactions=50, min_item_interactions=20, rating_threshold=4)
        ml_csr_cropped, ml_u_cropped_map, ml_i_cropped_map = self._filter_csr_by_max(ml_csr_dense, ml_u_dense_map, ml_i_dense_map, max_users=10000, max_items=5000)
        logging.info(f"[MOVIES MODEL] Obtained {ml_csr_cropped.nnz} ratings for {len(ml_u_cropped_map)} users and {len(ml_i_cropped_map)} items from MovieLens")
        logging.info(f"[MOVIES MODEL] Obtained {app_csr.nnz} ratings for {len(app_user_map)} users and {len(app_item_map)} items from in app history ratings")

        merged_csr, merged_user_map, merged_item_map = self._merge_csr_ratings(
            ml_csr_cropped, ml_u_cropped_map, ml_i_cropped_map,
            app_csr, app_user_map, app_item_map # we keep all of our users
        )

        logging.info(f"[MOVIES MODEL] Obtained {merged_csr.nnz} ratings for {len(merged_user_map)} users and {len(merged_item_map)} items.")

        # 4) we fit and store new model
        self._fit_model(merged_csr, merged_user_map, merged_item_map)

        self._store_model()

    def _fit_model(self, ratings: csr_matrix,
            user_id_map: Dict[int, int],
            item_id_map: Dict[int, int]):
        """
        Train the EASE model using a sparse user-item matrix.

        Args:
            ratings: CSR matrix (n_users × n_items)
            user_id_map: row_index → external user_id
            item_id_map: col_index → external item_id
        """

        # keep reverse maps
        #self.user_id_to_row = {uid: row for row, uid in user_id_map.items()}
        self.item_id_to_col = {iid: col for col, iid in item_id_map.items()}
        self.col_to_item_id = item_id_map

        self._train_ratings = ratings

        # EASE core:
        G = (ratings.T @ ratings).toarray()
        diag = np.arange(G.shape[0])
        G[diag, diag] += self.l2

        P = np.linalg.inv(G)

        B = -P / np.diag(P)[:, None]
        B[diag, diag] = 0

        self.B = B
        return self

    def _merge_csr_ratings(self, ml_csr, ml_user_map, ml_item_map,
                                        app_csr, app_user_map, app_item_map):

        # union všech movie_id
        all_items = sorted(set(ml_item_map.values()) | set(app_item_map.values()))
        item_to_col = {m: i for i, m in enumerate(all_items)}

        # offset pro APP uživatele
        app_offset = ml_csr.shape[0]

        # --------- MovieLens část ----------
        ml = ml_csr.tocoo()  # COO => row, col, data jsou synchronní
        ml_rows = ml.row
        ml_cols = np.array([item_to_col[ml_item_map[c]] for c in ml.col])
        ml_data = ml.data

        # --------- App část ----------
        app = app_csr.tocoo()
        app_rows = app.row + app_offset
        app_cols = np.array([item_to_col[app_item_map[c]] for c in app.col])
        app_data = app.data

        # --------- Spojení ----------
        rows = np.concatenate([ml_rows, app_rows])
        cols = np.concatenate([ml_cols, app_cols])
        data = np.concatenate([ml_data, app_data])

        merged = csr_matrix(
            (data, (rows, cols)),
            shape=(ml_csr.shape[0] + app_csr.shape[0], len(all_items))
        )

        # nové mapy
        merged_user_map = {
            **{r: u for r, u in ml_user_map.items()},
            **{r + app_offset: u for r, u in app_user_map.items()}
        }

        merged_item_map = {col: mid for mid, col in item_to_col.items()}

        return merged, merged_user_map, merged_item_map

    def _df_to_csr(self, df, user_col="user_id", item_col="movie_id", rating_col="rating"):
        """
        Converts long dataframe (user_id, movie_id, rating) into CSR matrix.
        Returns:
        csr_matrix
        user_id_map: row_idx → real_user_id
        item_id_map: col_idx → real_movie_id
        """

        # Create continuous integer indices
        unique_users = df[user_col].unique()
        unique_items = df[item_col].unique()

        user_to_row = {u: i for i, u in enumerate(unique_users)}
        item_to_col = {m: i for i, m in enumerate(unique_items)}

        # map df
        row = df[user_col].map(user_to_row).to_numpy()
        col = df[item_col].map(item_to_col).to_numpy()
        data = df[rating_col].astype(float).to_numpy()

        csr = csr_matrix((data, (row, col)),
                        shape=(len(unique_users), len(unique_items)))

        row_map = {i: u for u, i in user_to_row.items()}
        col_map = {i: m for m, i in item_to_col.items()}

        return csr, row_map, col_map

    def _filter_csr_by_max(
        self,
        ratings_csr: csr_matrix,
        user_id_map: Dict[int, int],
        item_id_map: Dict[int, int],
        max_users: Optional[int] = None,
        max_items: Optional[int] = None,
    ) -> Tuple[csr_matrix, Dict[int, int], Dict[int, int]]:
        """
        Hard-cap filter:
        - keeps only top-N most active users (if max_users is provided)
        - keeps only top-M most popular items (if max_items is provided)

        If max_users or max_items are None, retain all.
        Sorted by number of interactions (descending).
        """

        # Resolve limits
        n_users, n_items = ratings_csr.shape

        if max_users is None or max_users >= n_users:
            max_users = n_users

        if max_items is None or max_items >= n_items:
            max_items = n_items

        # Count interactions
        user_counts = np.asarray(ratings_csr.sum(axis=1)).flatten()
        item_counts = np.asarray(ratings_csr.sum(axis=0)).flatten()

        # Sort by activity/popularity
        sorted_user_idx = np.argsort(user_counts)[::-1]
        sorted_item_idx = np.argsort(item_counts)[::-1]

        # Take top-K
        top_users = sorted_user_idx[:max_users]
        top_items = sorted_item_idx[:max_items]

        # Filter CSR
        filtered = ratings_csr[top_users, :][:, top_items]

        # Rebuild maps
        new_user_map = {
            new_idx: user_id_map[old_idx]
            for new_idx, old_idx in enumerate(top_users)
        }

        new_item_map = {
            new_idx: item_id_map[old_idx]
            for new_idx, old_idx in enumerate(top_items)
        }

        return filtered, new_user_map, new_item_map


    def _filter_csr_by_interaction_thresholds(
        self,
        ratings_csr: csr_matrix,
        user_id_map: Dict[int, int],
        item_id_map: Dict[int, int],
        min_user_interactions: int = 50,
        min_item_interactions: int = 20,
        rating_threshold: float = 4.0,
    ) -> Tuple[csr_matrix, Dict[int, int], Dict[int, int]]:
        """
        Filters the CSR matrix and id maps by user/item interaction thresholds.

        Returns:
            - filtered_csr
            - new_user_id_map: row index → real userId
            - new_item_id_map: col index → real movieId
        """

        # 1. Remove zero values and mark positive values
        filtered = ratings_csr.copy()
        filtered.data = np.where(filtered.data >= rating_threshold, 1, 0)
        filtered.eliminate_zeros() # remove zeroes

        # 2. Sum all user and items interactions
        user_inter_counts = np.array(filtered.sum(axis=1)).flatten()
        item_inter_counts = np.array(filtered.sum(axis=0)).flatten()

        # find indices of users and items with sufficient counts of interactions
        valid_user_indices = np.where(user_inter_counts >= min_user_interactions)[0]
        valid_item_indices = np.where(item_inter_counts >= min_item_interactions)[0]

        # 3. Filter the valud data
        filtered_csr = ratings_csr[valid_user_indices, :][:, valid_item_indices]

        new_user_id_map = {
            new_idx: user_id_map[old_idx]
            for new_idx, old_idx in enumerate(valid_user_indices)
        }

        new_item_id_map = {
            new_idx: item_id_map[old_idx]
            for new_idx, old_idx in enumerate(valid_item_indices)
        }

        return filtered_csr, new_user_id_map, new_item_id_map

    def _load_model(self, train_if_not_exist=True):
        # if file exists ==> try to load the model parameters (matrix B)
        if Path.exists(self.model_path):
            logging.info("[INFO] Try to load the pre-trained model")
            with open(self.model_path, 'rb') as f:
                model_bundle = pickle.load(f)

                self.B = model_bundle.get("B")
                self.item_id_to_col = model_bundle.get("item_id_to_col", {})
                self.col_to_item_id = {
                    col: item for item, col in self.item_id_to_col.items()
                }

            logging.info("[INFO] Model loaded")
        else:
            # If the model doesn't exist, train it and save it
            logging.info("[MOVIES MODEL] Model not found, attempting to retrain.")
            self.retrain_model()
            self._store_model()

    def _store_model(self):
        logging.info("[MOVIES MODEL] Writing trained model to the disk.")

        model_bundle = {
                "B": self.B,
                "item_id_to_col": self.item_id_to_col,
            }

        with open(self.model_path, 'wb') as f:
            pickle.dump(model_bundle, f)



class EaserRecommender:
    """
    Wrapper around the EaserModel.
    Handles mapping between model indices and item IDs and provides
    convenient methods for scoring and generating top-K recommendations.
    """

    def __init__(self, easer_model: EaserModel):
        self.model: EaserModel = easer_model

    def recommend(
        self,
        profile: np.ndarray,
        k: int = 20,
        exclude_item_ids: Optional[Collection[int]] = None
    ):
        """
        Returns top-k recommendations as (item_id, score).
        Supports excluding certain item_ids (e.g., already seen).
        """

        scores = self.model.recommend_by_profile(profile)
        exclude = {int(x) for x in (exclude_item_ids or [])} # make sure we have correct type for check

        # nullify excluded items by setting score = -inf
        for col_idx, item_id in self.model.col_to_item_id.items():
            if item_id in exclude:
                scores[col_idx] = -np.inf

        # get top-k indices
        top_idx = np.argpartition(scores, -k)[-k:]

        # sort descending
        top_idx = top_idx[np.argsort(scores[top_idx])[::-1]]

        results = [
            (self.model.col_to_item_id[i], float(scores[i]))
            for i in top_idx
            if scores[i] != -np.inf
        ]

        return results


    def score_all(self, profile: np.ndarray) -> Dict[int, float]:
        """
        Returns full catalog as {item_id: score}
        """

        scores = self.model.recommend_by_profile(profile)

        return {
            self.model.col_to_item_id[i]: float(scores[i])
            for i in range(len(scores))
        }

    def get_catalog(self):
        return self.model.get_catalog()

    def iter_catalog(self):
        """
        Iterate the catalog in correct ordering of trained model.
        """
        for col_idx in range(len(self.model.col_to_item_id)):
            yield self.model.col_to_item_id[col_idx]

    def score_item(self, profile: np.ndarray, item_id: int) -> float:
        """
        Returns predicted score for a single item and user profile.
        Computes profile x B once and extracts the relevant index.
        item_id - MovieLens item_id
        """

        # translate item_id -> model column index
        if item_id not in self.model.item_id_to_col:
            raise KeyError(f"Item ID {item_id} not found in model catalogue.")

        col_idx = self.model.item_id_to_col[item_id]

        # full score vector
        scores = self.model.recommend_by_profile(profile)

        # return only the relevant score
        return float(scores[col_idx])


class RecencyReRanker:
    """
    Post-processing wrapper:
    - re-ranks candidates based on recency (year of release)
    """

    def __init__(self, base_recommender, movies_df, alpha=0.6, lambda_=0.2, min_candidate_pool_size=2000):
        self.base_rec = base_recommender
        self.beta = alpha # multiplicative rec. score x recency param
        self.lambda_ = lambda_ # exponential decay steepness param
        self.min_candidate_pool_size = min_candidate_pool_size

        self.current_year = int(movies_df['year'].max())
        self.year_map = dict(zip(movies_df['movieId'], movies_df['year']))

    def get_catalog(self):
        return self.base_rec.get_catalog()

    def score_item(self, profile, item_id):
        return self.base_rec.score_item(profile, item_id)

    def recommend(self, profile, k=10, exclude_item_ids=None):

        # we select larger candidate pool here
        candidate_count = max(k * 20, self.min_candidate_pool_size)

        candidates = self.base_rec.recommend(
            profile,
            k=candidate_count,
            exclude_item_ids=exclude_item_ids
        )

        # normalize scores 0-1
        scores = np.array([s for _, s in candidates])
        if len(scores) > 0:
            scores = (scores - scores.min()) / (scores.max() - scores.min() + 1e-8)

        self.beta = 0.4  # trade-off between old movies and new ones

        # recency scoring
        rescored = []
        for (item_id, _), norm_score in zip(candidates, scores):
            year = self.year_map.get(item_id, self.current_year)

            recency = np.exp(-self.lambda_ * (self.current_year - year))

            new_score = norm_score * (self.beta + (1 - self.beta) * recency)

            rescored.append((item_id, float(new_score), year))

        # sort based on the new score
        rescored.sort(key=lambda x: x[1], reverse=True)

        # diversify based on the time
        final = []
        last_years = []

        for item_id, score, year in rescored:

            # if we obtain two old movies next to each other we give larger penalization
            if len(last_years) >= 2:
                if all(y < 2000 for y in last_years[-2:]) and year < 2000:
                    continue

            final.append((item_id, score))
            last_years.append(year)

            if len(final) == k:
                break
        return final

class DiversifiedRecommender:
    """
    Post-processing wrapper:
    - delegates scoring to underlying recommender
    - ensures no two sequels end up next to each other
    """

    def __init__(self, base_recommender: EaserRecommender, dataset: str = MOVIE_LENS_DATASET_DIR, min_candidate_pool_size = 30):
        self.base_rec = base_recommender
        self.min_candidate_pool_size = min_candidate_pool_size

        # 1) we load movie names from movielens dataset

        self.dataset_directory = dataset
        try:
            self.movies_df = pd.read_csv(f'{self.dataset_directory}/movies.csv',
                                names=['movieId', 'title', 'genres', 'year'],
                                header=0,
                                encoding='latin1'
                                )

            logging.info("movies.csv loaded successfully")
            logging.info(f"\n{self.movies_df.head(50)}")
        except Exception as e:
            logging.error(f"Error loading movies.csv: {e}")

        self.recency = RecencyReRanker(self.base_rec, self.movies_df, alpha=0.4, lambda_=0.1)

        self.title_similarity = MovieTitleSimilarity(self.movies_df)

    def get_catalog(self):
        return self.base_rec.get_catalog()

    def score_item(self, profile: np.ndarray, item_id: int) -> float:
        return self.base_rec.score_item(profile, item_id)

    def recommend(self, profile, k: int = 10, exclude_item_ids=None, exclude_items_ids_soft=None):
        """
            Generate a diversified list of movie recommendations.

            The method delegates scoring to the underlying recommender, but applies
            an additional post-processing step to enforce title-based diversification.

            Args:
                profile: User or group preference profile used to generate recommendations.
                k: Number of items to return.
                exclude_item_ids: Item IDs that must never appear in recommendations (hard exclusion).
                exclude_items_ids_soft: Item IDs used only for title-similarity filtering in the current recommendation context (soft exclusion).

            Returns:
                List[Tuple[int, float]]: A list of (item_id, score) tuples representing the final,
                    diversified recommendations.
        """

        exclude_item_ids = exclude_item_ids or []
        exclude_items_ids_soft = exclude_items_ids_soft or []

        # We recommend more candidates
        candidate_count = max(k * 5, self.min_candidate_pool_size)

        candidates = self.recency.recommend(
            profile,
            k=candidate_count,
            exclude_item_ids=exclude_item_ids
        )

        final = []
        used_ids = []     # we store ids of selected movies

        for item_id, score in candidates:
            conflict = False

            # check if we already don't have similar movie
            for used in used_ids:
                if self.title_similarity.are_similar(item_id, used):
                    conflict = True
                    break

            # check against client provided items
            if not conflict:
                for soft in exclude_items_ids_soft:
                    if self.title_similarity.are_similar(item_id, soft):
                        conflict = True
                        break

            if conflict:
                continue

            final.append((item_id, score))
            used_ids.append(item_id)

            if len(final) == k:
                break

        return final